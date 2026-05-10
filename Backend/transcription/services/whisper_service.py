from functools import lru_cache

SUPPORTED_MODELS = {"tiny", "base", "small", "medium", "large"}
CPU_DEFAULT_MODEL = "base"
CUDA_DEFAULT_MODEL = "medium"


ALBANIAN_ALIASES = {"al", "alb", "sq", "sq-al", "albanian", "shqip"}

GERMAN_ALIASES = {
    "de", "deu", "german", "de-de", "de-ch", "hochdeutsch"
}


DIALECT_NORMALIZATION = {
    # Albanian
    "sq_kosovo_standard": "kosovo_albanian",
    "sq_prishtina": "kosovo_albanian",
    "sq_south_kosovo": "kosovo_albanian",

    # German
    "de_standard": "standard_german",
    "de_germany_native": "standard_german",
    "de_swiss_native": "swiss_german",
    "de_swiss_zurich": "swiss_german",
    "de_austrian": "austrian_german",
}

DIALECT_PROMPT_HINTS = {
    # Albanian
    "standard_albanian": "Transkripto ne shqip standard.",
    "kosovo_albanian": "Transkripto ne shqip te Kosoves me fjale dhe forme natyrale.",
    "north_albanian": "Transkripto ne dialektin verior te shqipes.",

    # German
    "standard_german": "Transkribiere auf Standarddeutsch (Hochdeutsch).",
    "swiss_german": "Transkribiere Schweizerdeutsch korrekt in Standarddeutsch.",
    "austrian_german": "Transkribiere österreichisches Deutsch korrekt in Standarddeutsch.",
}



def _load_whisper_runtime():
    try:
        import whisper
        import torch
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Whisper runtime missing. Install openai-whisper and torch."
        ) from exc

    device = "cuda" if torch.cuda.is_available() else "cpu"
    return whisper, torch, device



def _normalize_model_name(model_name: str = None) -> str:
    _, _, device = _load_whisper_runtime()

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
    whisper, _, device = _load_whisper_runtime()
    return whisper.load_model(model_name).to(device)



def _normalize_language_code(language_code: str = None):
    whisper, _, _ = _load_whisper_runtime()

    if not language_code:
        return None

    normalized = language_code.strip().lower()

    if not normalized:
        return None

    # Albanian aliases
    if normalized in ALBANIAN_ALIASES:
        return "sq"

    # German aliases
    if normalized in GERMAN_ALIASES:
        return "de"

    # Remove locale suffix (en-US → en)
    if "-" in normalized:
        normalized = normalized.split("-", 1)[0]

    supported_languages = whisper.tokenizer.LANGUAGES
    return normalized if normalized in supported_languages else None

def _build_initial_prompt(dialect_hint: str = None):
    if not dialect_hint:
        return None

    normalized = str(dialect_hint).strip().lower()
    normalized = DIALECT_NORMALIZATION.get(normalized, normalized)

    return DIALECT_PROMPT_HINTS.get(normalized)



def transcribe_audio(
    audio_path: str,
    forced_language: str = None,
    model_name: str = None,
    dialect_hint: str = None,
):
    _, _, device = _load_whisper_runtime()

    language_code = _normalize_language_code(forced_language)
    resolved_model_name = _normalize_model_name(model_name)
    model = _get_model(resolved_model_name)

    initial_prompt = _build_initial_prompt(dialect_hint)

    result = model.transcribe(
        audio_path,
        language=language_code,
        task="transcribe",
        initial_prompt=initial_prompt,
        fp16=(device == "cuda"),
    )

    return {
        "text": result["text"].strip(),
        "language": result.get("language", "unknown"),
        "dialect_hint": dialect_hint,
        "model": resolved_model_name,
        "segments": result["segments"],
    }