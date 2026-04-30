import whisper
import torch
from functools import lru_cache

device = "cuda" if torch.cuda.is_available() else "cpu"

SUPPORTED_MODELS = {"tiny", "base", "small", "medium", "large"}
CPU_DEFAULT_MODEL = "base"
CUDA_DEFAULT_MODEL = "medium"

ALBANIAN_ALIASES = {"al", "alb", "sq", "sq-al", "albanian", "shqip"}
DIALECT_PROMPT_HINTS = {
    "standard_albanian": "Transkripto ne shqip standard.",
    "kosovo_albanian": "Transkripto ne shqip te Kosoves me fjale dhe forme natyrale.",
    "north_albanian": "Transkripto ne dialektin verior te shqipes.",
}


def _normalize_model_name(model_name: str = None) -> str:
    if not model_name:
        return CUDA_DEFAULT_MODEL if device == "cuda" else CPU_DEFAULT_MODEL

    normalized = model_name.strip().lower()
    if normalized == "large-v3":
        normalized = "large"
    if normalized not in SUPPORTED_MODELS:
        return CUDA_DEFAULT_MODEL if device == "cuda" else CPU_DEFAULT_MODEL
    return normalized


@lru_cache(maxsize=5)
def _get_model(model_name: str):
    return whisper.load_model(model_name).to(device)


def _normalize_language_code(language_code: str = None):
    if not language_code:
        return None

    normalized = language_code.strip().lower()
    if not normalized:
        return None

    if normalized in ALBANIAN_ALIASES:
        return "sq"

    # Accept locale-style values like "en-US" by using base language.
    if "-" in normalized:
        normalized = normalized.split("-", 1)[0]

    supported_languages = whisper.tokenizer.LANGUAGES
    return normalized if normalized in supported_languages else None


def _build_initial_prompt(dialect_hint: str = None):
    if not dialect_hint:
        return None
    return DIALECT_PROMPT_HINTS.get(str(dialect_hint).strip().lower())


def transcribe_audio(
    audio_path: str,
    forced_language: str = None,
    model_name: str = None,
    dialect_hint: str = None,
):
    """
    forced_language:
        - "sq", "en", "tr", etc.
        - or None for auto-detection
    """

    language_code = _normalize_language_code(forced_language)
    resolved_model_name = _normalize_model_name(model_name)
    model = _get_model(resolved_model_name)
    initial_prompt = _build_initial_prompt(dialect_hint)

    result = model.transcribe(
        audio_path,
        language=language_code,
        task="transcribe",
        initial_prompt=initial_prompt,
        fp16=(device == "cuda")
    )

    return {
        "text": result["text"].strip(),
        "language": result.get("language", "unknown"),
        "segments": result["segments"]
    }