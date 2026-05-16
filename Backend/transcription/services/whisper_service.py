import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

SUPPORTED_MODELS = {"tiny", "base", "small", "medium", "large", "large-v2", "large-v3"}
CPU_DEFAULT_MODEL = "small"
CUDA_DEFAULT_MODEL = "large"


ALBANIAN_ALIASES = {"al", "alb", "sq", "sq-al", "sq_al", "albanian", "shqip"}

GERMAN_ALIASES = {
    "de", "deu", "ger", "german", "de-de", "de-ch", "hochdeutsch"
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
    # Albanian — domain prompt anchors q/ç/ë orthography and ASR vocabulary
    "standard_albanian": (
        "Përshëndetje. Qëllimi është të vlerësohet saktësia e njohjes automatike të të folurit në gjuhën shqipe."
    ),
    "kosovo_albanian": (
        "Përshëndetje. Qëllimi është të vlerësohet saktësia e njohjes automatike të të folurit në gjuhën shqipe të Kosovës."
    ),
    "north_albanian": (
        "Përshëndetje. Qëllimi është të vlerësohet saktësia e njohjes automatike të të folurit në gjuhën shqipe."
    ),

    # German
    "standard_german": "Guten Tag. Heute sprechen wir über Technologie und Wissenschaft.",
    "swiss_german": "Grüezi. Heute sprechen wir über Technologie und Wissenschaft.",
    "austrian_german": "Guten Tag. Heute sprechen wir über Technologie und Wissenschaft.",
}

# Fallback for language=sq with no dialect hint
ALBANIAN_FALLBACK_PROMPT = (
    "Përshëndetje. Qëllimi është të vlerësohet saktësia e njohjes automatike të të folurit në gjuhën shqipe."
)


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

    # 1. Albanian
    if normalized in ALBANIAN_ALIASES:
        return "sq"

    # 2. German
    if normalized in GERMAN_ALIASES:
        return "de"

    # 3. normalise separators (sq_AL → sq-al, de-DE → de)
    normalized = normalized.replace("_", "-")
    if "-" in normalized:
        normalized = normalized.split("-", 1)[0]

    supported_languages = whisper.tokenizer.LANGUAGES

    result = normalized if normalized in supported_languages else None
    if result is None:
        logger.warning("Whisper: unrecognised language code %r — will auto-detect", language_code)
    return result


def _build_initial_prompt(dialect_hint: str = None):
    if not dialect_hint:
        return None

    normalized = str(dialect_hint).strip().lower()
    normalized = DIALECT_NORMALIZATION.get(normalized, normalized)

    return DIALECT_PROMPT_HINTS.get(normalized)


def _remove_repetitions(text: str, max_repeats: int = 3) -> str:
    """Drop runs of the same word/token repeated more than max_repeats times."""
    if not text:
        return text
    words = text.split()
    result = []
    run = 0
    prev = None
    for w in words:
        if w == prev:
            run += 1
        else:
            run = 1
            prev = w
        if run <= max_repeats:
            result.append(w)
    return " ".join(result)


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
    # If Albanian with no dialect hint, use fallback to prevent Slavic drift
    if initial_prompt is None and language_code == "sq":
        initial_prompt = ALBANIAN_FALLBACK_PROMPT

    transcribe_args = {
        "audio": audio_path,
        "task": "transcribe",
        "initial_prompt": initial_prompt,
        "fp16": (device == "cuda"),
        "condition_on_previous_text": False,
        "temperature": 0,
        "beam_size": 10,
    }

    if language_code:
        transcribe_args["language"] = language_code

    logger.info(
        "Whisper transcribing: model=%s forced_lang=%r db_code=%r prompt=%r",
        resolved_model_name, language_code, forced_language, initial_prompt,
    )

    result = model.transcribe(**transcribe_args)
    text = _remove_repetitions(result["text"].strip())

    detected = result.get("language", "unknown")
    logger.info(
        "Whisper result: detected_lang=%r text_preview=%r",
        detected, text[:120],
    )

    return {
        "text": text,
        "language": detected,
        "dialect_hint": dialect_hint,
        "model": resolved_model_name,
        "segments": result["segments"],
    }