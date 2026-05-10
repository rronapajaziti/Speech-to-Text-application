import os
import tempfile

GOOGLE_LANGUAGE_BY_CODE = {
    "sq": "sq-AL",
    "en": "en-US",
    "tr": "tr-TR",
    "de": "de-DE",  # ✅ FIXED: German added
}


def _load_google_asr_runtime():
    try:
        from pydub import AudioSegment
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Google ASR runtime is not installed. Missing dependency: pydub."
        ) from exc

    try:
        from speech_recognition import AudioFile, Recognizer, UnknownValueError, RequestError
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Google ASR runtime is not installed. Missing dependency: SpeechRecognition."
        ) from exc

    return AudioSegment, AudioFile, Recognizer, UnknownValueError, RequestError


def transcribe_audio_google(audio_path: str, forced_language: str = None):
    AudioSegment, AudioFile, Recognizer, UnknownValueError, RequestError = _load_google_asr_runtime()

    # Normalize language input
    language_code = (forced_language or "").strip().lower()

    # Handle cases like "de-DE", "de_ch", etc.
    if "-" in language_code:
        language_code = language_code.split("-", 1)[0]
    if "_" in language_code:
        language_code = language_code.split("_", 1)[0]

    # ✅ Safe lookup with fallback
    google_language = GOOGLE_LANGUAGE_BY_CODE.get(language_code)

    if not google_language:
        # fallback rules
        if language_code.startswith("de"):
            google_language = "de-DE"
        else:
            google_language = "en-US"

    temp_wav_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    temp_wav_path = temp_wav_file.name
    temp_wav_file.close()

    try:
        # Convert audio to proper format
        AudioSegment.from_file(audio_path).set_channels(1).set_frame_rate(16000).export(
            temp_wav_path,
            format="wav",
        )

        recognizer = Recognizer()

        with AudioFile(temp_wav_path) as source:
            audio_data = recognizer.record(source)

        try:
            text = recognizer.recognize_google(
                audio_data,
                language=google_language
            )
        except UnknownValueError:
            text = ""
        except RequestError as exc:
            raise RuntimeError(f"Google ASR request failed: {exc}") from exc

        return {
            "text": text.strip(),
            "language": language_code or "unknown",
            "segments": []
        }

    finally:
        if os.path.exists(temp_wav_path):
            os.remove(temp_wav_path)