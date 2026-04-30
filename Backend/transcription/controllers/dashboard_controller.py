from django.db.models import Avg, Count, Min, Max
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..models import Transcription, EvaluationResults


@api_view(["GET"])
def getDashboardStats(request):
    total_transcriptions = Transcription.objects.count()
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
    low_wer_count = Transcription.objects.filter(wer_score__isnull=False, wer_score__lte=0.2).count()
    high_wer_count = Transcription.objects.filter(wer_score__isnull=False, wer_score__gte=0.4).count()
    with_reference_count = Transcription.objects.exclude(reference_text__isnull=True).exclude(reference_text="").count()

    low_wer_ratio = (low_wer_count / with_reference_count * 100) if with_reference_count else 0.0
    high_wer_ratio = (high_wer_count / with_reference_count * 100) if with_reference_count else 0.0

    evaluation_aggregates = EvaluationResults.objects.aggregate(
        average_accuracy=Avg("accuracy"),
        average_error_rate=Avg("wer")
    )

    model_distribution = (
        Transcription.objects.exclude(model_name="")
        .values("model_name")
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    language_distribution = (
        Transcription.objects.values("audio__language__language_name", "audio__language__code")
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
            "average_accuracy_score": round(evaluation_aggregates["average_accuracy"] or 0.0, 4),
            "average_error_rate": round(evaluation_aggregates["average_error_rate"] or 0.0, 4),
            "low_wer_ratio_percent": round(low_wer_ratio, 2),
            "high_wer_ratio_percent": round(high_wer_ratio, 2),
        },
        "wer_metrics": {
            "average_wer": round(wer_aggregates["average_wer"] or 0.0, 4),
            "best_wer": round(wer_aggregates["best_wer"] or 0.0, 4),
            "worst_wer": round(wer_aggregates["worst_wer"] or 0.0, 4),
            "samples_with_reference_text": with_reference_count,
        },
        "variation_coverage": {
            "unique_models_tested": len(model_distribution),
            "unique_languages_tested": len(language_distribution),
            "model_distribution": list(model_distribution),
            "language_distribution": list(language_distribution),
            "noise_metadata_available": False,
            "dialect_metadata_available": False,
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
