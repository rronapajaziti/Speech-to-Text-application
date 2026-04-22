from jiwer import wer, cer, process_words

def calculate_wer(reference, hypothesis):
    return wer(reference, hypothesis)


def calculate_asr_stats(reference: str, hypothesis: str):
    """
    Returns common ASR metrics for a single (reference, hypothesis) pair.
    Values are floats in [0, 1] for rates and ints for counts.
    """
    out = process_words(reference, hypothesis)
    return {
        "wer": float(out.wer),
        "mer": float(out.mer),
        "wil": float(out.wil),
        "wip": float(out.wip),
        "cer": float(cer(reference, hypothesis)),
        "hits": int(out.hits),
        "substitutions": int(out.substitutions),
        "deletions": int(out.deletions),
        "insertions": int(out.insertions),
    }