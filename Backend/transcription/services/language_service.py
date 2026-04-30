from transcription.models import Language


def get_language_code(language_id: int) -> str:
    """
    Converts DB language ID → Whisper language code
    Example:
        1 → "sq"
        2 → "en"
    """

    try:
        lang = Language.objects.get(id=language_id)
        return lang.code
    except Language.DoesNotExist:
        return None