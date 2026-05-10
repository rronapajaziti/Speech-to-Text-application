import re

from jiwer import wer, cer, process_words

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


def normalize(text: str) -> str:
    if not text:
        return ""
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    normalized_tokens = [NUMBER_WORDS.get(token, token) for token in tokens]
    return " ".join(normalized_tokens)


def calculate_asr_stats(reference: str, hypothesis: str):
    reference = normalize(reference)
    hypothesis = normalize(hypothesis)

    if not reference or not hypothesis:
        return {
            "wer": 1.0,
            "cer": 1.0,
            "mer": 1.0,
            "wil": 1.0,
            "wip": 0.0,
            "accuracy": 0.0,
            "hits": 0,
            "substitutions": 0,
            "deletions": 0,
            "insertions": 0,
            "alignment": [],
        }

    out = process_words(reference, hypothesis)

    return {
        "wer": float(out.wer),
        "mer": float(out.mer),
        "wil": float(out.wil),
        "wip": float(out.wip),
        "cer": float(cer(reference, hypothesis)),

        # 🔥 FIX: consistent accuracy
        "accuracy": float(max(0.0, 1.0 - out.wer)),

        "hits": int(out.hits),
        "substitutions": int(out.substitutions),
        "deletions": int(out.deletions),
        "insertions": int(out.insertions),

        # optional (if you later add alignment mapping)
        "alignment": [],
    }