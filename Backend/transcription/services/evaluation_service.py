from ..utils.metrics import calculate_wer


def evaluate_transcription(reference_text, hypothesis_text):
    if not reference_text:
        return {"wer": 1.0, "valid": False}

    if not hypothesis_text:
        return {"wer": 1.0, "valid": False}

    reference_text = reference_text.lower().strip()
    hypothesis_text = hypothesis_text.lower().strip()

    return {
        "wer": calculate_wer(reference_text, hypothesis_text),
        "valid": True
    }