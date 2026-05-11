import difflib
from collections import Counter

from django.db.models import Avg, Count, Min, Max, Sum
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..models import Transcription, EvaluationResults

EVAL_ANNOTATIONS = dict(
    count=Count("id"),
    avg_wer=Avg("wer"),
    avg_cer=Avg("cer"),
    total_hits=Sum("hits"),
    total_substitutions=Sum("substitutions"),
    total_deletions=Sum("deletions"),
    total_insertions=Sum("insertions"),
)

AGE_ORDER = ["Under 18", "18-25", "26-35", "36-50", "51+"]


def _age_bucket(age):
    if age is None:
        return None
    if age < 18:
        return "Under 18"
    if age <= 25:
        return "18-25"
    if age <= 35:
        return "26-35"
    if age <= 50:
        return "36-50"
    return "51+"


def _build_comparison_item(label_key, item):
    avg_wer = item["avg_wer"] or 0.0
    return {
        label_key: item[label_key],
        "count": item["count"],
        "avg_wer": round(avg_wer, 4),
        "avg_accuracy": round(max(0.0, 1.0 - avg_wer), 4),
        "avg_cer": round(item["avg_cer"] or 0.0, 4),
        "total_hits": item["total_hits"] or 0,
        "total_substitutions": item["total_substitutions"] or 0,
        "total_deletions": item["total_deletions"] or 0,
        "total_insertions": item["total_insertions"] or 0,
    }


@api_view(["GET"])
def getDashboardStats(request):
    total_transcriptions = Transcription.objects.count()
    total_evaluations = EvaluationResults.objects.count()
    completed_transcriptions = Transcription.objects.filter(status="completed").count()
    failed_transcriptions = Transcription.objects.filter(status="failed").count()
    pending_transcriptions = Transcription.objects.filter(status="pending").count()
    processing_transcriptions = Transcription.objects.filter(status="processing").count()

    success_rate = (
        (completed_transcriptions / total_transcriptions) * 100
        if total_transcriptions
        else 0.0
    )

    wer_aggregates = Transcription.objects.aggregate(
        average_wer=Avg("wer_score"),
        best_wer=Min("wer_score"),
        worst_wer=Max("wer_score"),
    )
    system_avg_wer = round(float(wer_aggregates["average_wer"] or 0.0), 4)

    low_wer_count = Transcription.objects.filter(
        wer_score__isnull=False, wer_score__lte=0.2
    ).count()
    high_wer_count = Transcription.objects.filter(
        wer_score__isnull=False, wer_score__gte=0.4
    ).count()
    with_reference_count = (
        Transcription.objects
        .exclude(reference_text__isnull=True)
        .exclude(reference_text="")
        .values("reference_text")
        .distinct()
        .count()
    )

    low_wer_ratio = (low_wer_count / with_reference_count * 100) if with_reference_count else 0.0
    high_wer_ratio = (high_wer_count / with_reference_count * 100) if with_reference_count else 0.0

    eval_agg = EvaluationResults.objects.aggregate(
        average_error_rate=Avg("wer"),
        total_hits=Sum("hits"),
        total_substitutions=Sum("substitutions"),
        total_deletions=Sum("deletions"),
        total_insertions=Sum("insertions"),
    )
    average_error_rate = float(eval_agg["average_error_rate"] or 0.0)
    average_accuracy = max(0.0, 1.0 - average_error_rate)

    # WER distribution buckets
    wer_scored_total = EvaluationResults.objects.count()
    wer_distribution = {
        "excellent_count": EvaluationResults.objects.filter(wer__lt=0.1).count(),
        "good_count": EvaluationResults.objects.filter(wer__gte=0.1, wer__lt=0.2).count(),
        "fair_count": EvaluationResults.objects.filter(wer__gte=0.2, wer__lt=0.4).count(),
        "poor_count": EvaluationResults.objects.filter(wer__gte=0.4).count(),
        "total_scored": wer_scored_total,
    }

    # Gender analysis
    gender_analysis = [
        _build_comparison_item("gender", item)
        for item in (
            EvaluationResults.objects
            .exclude(gender__isnull=True)
            .exclude(gender="")
            .values("gender")
            .annotate(**EVAL_ANNOTATIONS)
            .order_by("avg_wer")
        )
    ]

    # Dialect analysis
    dialect_analysis = [
        _build_comparison_item("dialect", item)
        for item in (
            EvaluationResults.objects
            .exclude(dialect__isnull=True)
            .exclude(dialect="")
            .values("dialect")
            .annotate(**EVAL_ANNOTATIONS)
            .order_by("avg_wer")
        )
    ]

    # Language WER analysis (via transcription -> audio -> language)
    raw_lang_wer = (
        EvaluationResults.objects
        .values(
            "transcription__audio__language__language_name",
            "transcription__audio__language__code",
        )
        .annotate(**EVAL_ANNOTATIONS)
        .order_by("avg_wer")
    )
    language_wer_analysis = [
        {
            "language_name": item["transcription__audio__language__language_name"] or "Unknown",
            "language_code": item["transcription__audio__language__code"] or "?",
            "count": item["count"],
            "avg_wer": round(item["avg_wer"] or 0.0, 4),
            "avg_accuracy": round(max(0.0, 1.0 - (item["avg_wer"] or 0.0)), 4),
            "avg_cer": round(item["avg_cer"] or 0.0, 4),
            "total_hits": item["total_hits"] or 0,
            "total_substitutions": item["total_substitutions"] or 0,
            "total_deletions": item["total_deletions"] or 0,
            "total_insertions": item["total_insertions"] or 0,
        }
        for item in raw_lang_wer
    ]

    # Age bucket analysis
    age_buckets: dict = {}
    for row in EvaluationResults.objects.exclude(age__isnull=True).values(
        "age", "wer", "cer", "hits", "substitutions", "deletions", "insertions"
    ):
        bucket = _age_bucket(row["age"])
        if bucket is None:
            continue
        if bucket not in age_buckets:
            age_buckets[bucket] = {
                "count": 0,
                "wer_sum": 0.0,
                "cer_sum": 0.0,
                "hits": 0,
                "substitutions": 0,
                "deletions": 0,
                "insertions": 0,
            }
        d = age_buckets[bucket]
        d["count"] += 1
        d["wer_sum"] += row["wer"]
        d["cer_sum"] += row["cer"] or 0.0
        d["hits"] += row["hits"]
        d["substitutions"] += row["substitutions"]
        d["deletions"] += row["deletions"]
        d["insertions"] += row["insertions"]

    age_analysis = sorted(
        [
            {
                "age_group": bucket,
                "count": d["count"],
                "avg_wer": round(d["wer_sum"] / d["count"], 4),
                "avg_accuracy": round(max(0.0, 1.0 - d["wer_sum"] / d["count"]), 4),
                "avg_cer": round(d["cer_sum"] / d["count"], 4),
                "total_hits": d["hits"],
                "total_substitutions": d["substitutions"],
                "total_deletions": d["deletions"],
                "total_insertions": d["insertions"],
            }
            for bucket, d in age_buckets.items()
        ],
        key=lambda x: AGE_ORDER.index(x["age_group"]) if x["age_group"] in AGE_ORDER else 99,
    )

    # Most problematic words (reference words most often substituted or deleted)
    word_error_counter: Counter = Counter()
    for t in (
        Transcription.objects
        .exclude(reference_text__isnull=True)
        .exclude(reference_text="")
        .exclude(raw_text="")
        .values("reference_text", "raw_text")[:500]
    ):
        ref_words = t["reference_text"].lower().split()
        hyp_words = t["raw_text"].lower().split()
        for tag, i1, i2, _j1, _j2 in difflib.SequenceMatcher(None, ref_words, hyp_words).get_opcodes():
            if tag in ("replace", "delete"):
                for word in ref_words[i1:i2]:
                    word_error_counter[word] += 1

    problematic_words = [
        {"word": word, "error_count": count}
        for word, count in word_error_counter.most_common(20)
    ]

    # Model distribution
    model_distribution = list(
        Transcription.objects.exclude(model_name="")
        .values("model_name")
        .annotate(total=Count("id"))
        .order_by("-total")
    )
    model_performance = list(
        Transcription.objects.exclude(model_name="")
        .values("model_name")
        .annotate(
            total=Count("id"),
            avg_wer=Avg("wer_score"),
            best_wer=Min("wer_score"),
            worst_wer=Max("wer_score"),
        )
        .order_by("-total")
    )

    language_distribution = list(
        Transcription.objects
        .values("audio__language__language_name", "audio__language__code")
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    recent_activity = (
        Transcription.objects.select_related("audio", "audio__language")
        .order_by("-date_created")[:5]
    )

    response_payload = {
        "workflow_factors": {
            "total_transcriptions": total_transcriptions,
            "total_evaluations": total_evaluations,
            "completed_transcriptions": completed_transcriptions,
            "failed_transcriptions": failed_transcriptions,
            "pending_transcriptions": pending_transcriptions,
            "processing_transcriptions": processing_transcriptions,
            "success_rate_percent": round(success_rate, 2),
            "average_audio_duration_seconds": round(
                Transcription.objects.aggregate(value=Avg("audio__duration"))["value"] or 0.0,
                2,
            ),
        },
        "robustness_and_accuracy": {
            "average_accuracy_score": round(average_accuracy, 4),
            "average_error_rate": round(average_error_rate, 4),
            "low_wer_ratio_percent": round(low_wer_ratio, 2),
            "high_wer_ratio_percent": round(high_wer_ratio, 2),
            "total_hits": eval_agg["total_hits"] or 0,
            "total_substitutions": eval_agg["total_substitutions"] or 0,
            "total_deletions": eval_agg["total_deletions"] or 0,
            "total_insertions": eval_agg["total_insertions"] or 0,
        },
        "wer_metrics": {
            "average_wer": round(wer_aggregates["average_wer"] or 0.0, 4),
            "best_wer": round(wer_aggregates["best_wer"] or 0.0, 4),
            "worst_wer": round(wer_aggregates["worst_wer"] or 0.0, 4),
            "samples_with_reference_text": with_reference_count,
        },
        "wer_benchmark": {
            "literature_low_wer": 0.20,
            "literature_high_wer": 0.50,
            "system_average_wer": system_avg_wer,
            "system_average_accuracy": round(max(0.0, 1.0 - system_avg_wer), 4),
            "beats_benchmark": bool(system_avg_wer < 0.20),
            "within_benchmark": bool(0.20 <= system_avg_wer <= 0.50),
            "above_benchmark": bool(system_avg_wer > 0.50),
        },
        "wer_distribution": wer_distribution,
        "gender_analysis": gender_analysis,
        "dialect_analysis": dialect_analysis,
        "language_wer_analysis": language_wer_analysis,
        "age_analysis": age_analysis,
        "problematic_words": problematic_words,
        "variation_coverage": {
            "unique_models_tested": len(model_distribution),
            "unique_languages_tested": len(language_distribution),
            "model_distribution": model_distribution,
            "model_performance": [
                {
                    "model_name": item["model_name"] or "unknown",
                    "total": item["total"],
                    "avg_wer": round(item["avg_wer"], 4) if item["avg_wer"] is not None else None,
                    "best_wer": round(item["best_wer"], 4) if item["best_wer"] is not None else None,
                    "worst_wer": round(item["worst_wer"], 4) if item["worst_wer"] is not None else None,
                    "avg_accuracy": round(max(0.0, 1.0 - item["avg_wer"]), 4) if item["avg_wer"] is not None else None,
                }
                for item in model_performance
            ],
            "language_distribution": language_distribution,
            "noise_metadata_available": False,
            "dialect_metadata_available": bool(dialect_analysis),
        },
        "recent_activity": [
            {
                "id": item.id,
                "status": item.status,
                "model_name": item.model_name,
                "language": (
                    item.audio.language.language_name
                    if item.audio and item.audio.language
                    else "Unknown"
                ),
                "date_created": item.date_created.isoformat() if item.date_created else None,
                "wer_score": item.wer_score,
            }
            for item in recent_activity
        ],
    }
    return Response(response_payload)
