from transcription.services.whisper_service import transcribe_audio
from transcription.services.language_service import get_language_code
from transcription.models import Transcription


def process_audio(audio_obj, reference_text: str = None):
    """
    Full pipeline:
    1. Get language code
    2. Run Whisper
    3. Save transcription
    """

    # Convert FK → ISO code
    lang_code = get_language_code(audio_obj.language_id)

    # Run Whisper
    result = transcribe_audio(
        audio_obj.audio_file.path,
        forced_language=lang_code
    )

    # Save transcription in DB
    transcription = Transcription.objects.create(
        audio_id=audio_obj.id,
        raw_text=result["text"],
        reference_text=reference_text,
        model_name="whisper-medium",
        status="completed"
    )

    return transcription