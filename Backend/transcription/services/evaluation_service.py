import re
from difflib import SequenceMatcher

NUMBER_WORDS = {
    "zero": "0",
    "one": "1",
    "two": "2",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9",
    "ten": "10",
}


def _normalize_token(token: str) -> str:
    return NUMBER_WORDS.get(token, token)


def _tokenize(text: str) -> list[str]:
    if not text:
        return []
    # [^\W_]+ matches Unicode word chars (incl. ë, ç, ä, ü …) but not underscore
    tokens = re.findall(r"[^\W_]+", text.lower())
    return [_normalize_token(token) for token in tokens]


def _build_alignment(reference_text: str, hypothesis_text: str) -> list[dict]:
    ref_words = _tokenize(reference_text)
    hyp_words = _tokenize(hypothesis_text)

    matcher = SequenceMatcher(a=ref_words, b=hyp_words)
    alignment: list[dict] = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for w in ref_words[i1:i2]:
                alignment.append({"word": w, "type": "correct"})
        elif tag == "replace":
            ref_chunk = ref_words[i1:i2]
            hyp_chunk = hyp_words[j1:j2]
            common = min(len(ref_chunk), len(hyp_chunk))

            # Pair substitutions first
            for k in range(common):
                alignment.append({"word": hyp_chunk[k], "type": "wrong"})

            # Remaining reference tokens are missing
            for w in ref_chunk[common:]:
                alignment.append({"word": w, "type": "missing"})

            # Remaining hypothesis tokens are extra
            for w in hyp_chunk[common:]:
                alignment.append({"word": w, "type": "extra"})
        elif tag == "delete":
            for w in ref_words[i1:i2]:
                alignment.append({"word": w, "type": "missing"})
        elif tag == "insert":
            for w in hyp_words[j1:j2]:
                alignment.append({"word": w, "type": "extra"})

    return alignment


def evaluate_transcription(reference_text, hypothesis_text):
    from ..utils.metrics import calculate_asr_stats

    if not reference_text or not hypothesis_text:
        return {
            "wer": 1.0,
            "cer": 1.0,
            "mer": 1.0,
            "wil": 1.0,
            "wip": 0.0,
            "accuracy": 0.0,
            "substitutions": 0,
            "deletions": 0,
            "insertions": 0,
            "valid": False,
            "alignment": []
        }

    reference_text = reference_text.lower().strip()
    hypothesis_text = hypothesis_text.lower().strip()

    stats = calculate_asr_stats(reference_text, hypothesis_text)

    wer = stats.get("wer", 1.0)

    alignment = _build_alignment(reference_text, hypothesis_text)

    return {
        "wer": wer,
        "cer": stats.get("cer", 1.0),

        # ✅ FIXED (NO NULLS ANYMORE)
        "mer": stats.get("mer", 1.0),
        "wil": stats.get("wil", 1.0),
        "wip": stats.get("wip", 0.0),

        "accuracy": max(0, (1 - wer) * 100),

        "hits": stats.get("hits", 0),
        "substitutions": stats.get("substitutions", 0),
        "deletions": stats.get("deletions", 0),
        "insertions": stats.get("insertions", 0),

        "valid": True,
        "alignment": alignment
    }