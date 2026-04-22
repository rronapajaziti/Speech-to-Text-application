from ..utils.metrics import calculate_asr_stats


def evaluate_transcription(reference_text, hypothesis_text):
    if not reference_text:
        return {"wer": 1.0, "valid": False}

    if not hypothesis_text:
        return {"wer": 1.0, "valid": False}

    reference_text = reference_text.lower().strip()
    hypothesis_text = hypothesis_text.lower().strip()

    stats = calculate_asr_stats(reference_text, hypothesis_text)
    stats["valid"] = True
    return stats