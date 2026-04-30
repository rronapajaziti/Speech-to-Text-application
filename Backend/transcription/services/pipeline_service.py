import logging
from django.shortcuts import get_object_or_404

from ..models import AudioFiles, Transcription
from .whisper_service import transcribe_audio
from .google_asr_service import transcribe_audio_google
from .evaluation_service import evaluate_transcription

logger = logging.getLogger(__name__)


def create_transcription(
    audio_id,
    reference_text=None,
    model_name="base",
    mode="transcribe",
    dialect_hint=None,
):
    audio = get_object_or_404(AudioFiles, id=audio_id)

    if not audio.audio_file:
        raise ValueError("Selected audio record does not contain a valid audio file.")

    transcription = Transcription.objects.create(
        audio=audio,
        raw_text="",
        reference_text=reference_text,
        wer_score=None,
        status="processing",
        model_name=model_name,
    )

    try:
        forced_language = getattr(audio.language, "code", None)
        normalized_model_name = (model_name or "").strip().lower()
        if normalized_model_name == "google":
            transcription_result = transcribe_audio_google(
                audio.audio_file.path,
                forced_language=forced_language,
            )
        else:
            transcription_result = transcribe_audio(
                audio.audio_file.path,
                forced_language=forced_language,
                model_name=model_name,
                dialect_hint=dialect_hint,
            )
        raw_text = (
            transcription_result.get("text", "")
            if isinstance(transcription_result, dict)
            else str(transcription_result or "")
        )
        transcription.raw_text = raw_text

        if mode == "evaluate" or reference_text:
            evaluation = evaluate_transcription(reference_text, raw_text)
            transcription.wer_score = evaluation.get("wer")

        transcription.status = "completed"
        transcription.save()

        return {
            "id": transcription.id,
            "audio_id": audio.id,
            "audio_file_name": audio.file_name,
            "raw_text": transcription.raw_text,
            "reference_text": transcription.reference_text,
            "wer_score": transcription.wer_score,
            "status": transcription.status,
            "model_name": transcription.model_name,
            "date_created": transcription.date_created.isoformat(),
        }
    except Exception:
        transcription.status = "failed"
        transcription.save()
        logger.exception("Pipeline failed while processing audio %s", audio_id)
        raise


def update_transcription(transcription, data):
    raw_text = data.get("raw_text", transcription.raw_text)
    final_text = data.get("final_text", transcription.final_text)
    reference_text = data.get("reference_text", transcription.reference_text)
    model_name = data.get("model_name", transcription.model_name)
    status = data.get("status", transcription.status)

    transcription.raw_text = raw_text
    transcription.final_text = final_text
    transcription.reference_text = reference_text
    transcription.model_name = model_name
    transcription.status = status

    if reference_text and raw_text:
        evaluation = evaluate_transcription(reference_text, raw_text)
        transcription.wer_score = evaluation.get("wer")

    transcription.save()
    return transcription
