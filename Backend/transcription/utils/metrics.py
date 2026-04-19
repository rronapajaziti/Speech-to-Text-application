from jiwer import wer

def calculate_wer(reference, hypothesis):
    return wer(reference, hypothesis)