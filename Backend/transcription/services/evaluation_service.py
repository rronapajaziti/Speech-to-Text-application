from ..utils.metrics import calculate_asr_stats


def evaluate_transcription(reference_text, hypothesis_text):
    if not reference_text or not hypothesis_text:
        return {
            "wer": 1.0,
            "cer": 1.0,
            "accuracy": 0.0,
            "substitutions": 0,
            "deletions": 0,
            "insertions": 0,
            "valid": False
        }

    reference_text = reference_text.lower().strip()
    hypothesis_text = hypothesis_text.lower().strip()

    stats = calculate_asr_stats(reference_text, hypothesis_text)

    wer = stats.get("wer", 1.0)

    return {
        "wer": wer,
        "cer": stats.get("cer", 1.0),
        "accuracy": max(0, 1 - wer),
        "substitutions": stats.get("substitutions", 0),
        "deletions": stats.get("deletions", 0),
        "insertions": stats.get("insertions", 0),
        "valid": True
    }