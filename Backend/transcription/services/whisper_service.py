import whisper
import torch


device = "cuda" if torch.cuda.is_available() else "cpu"


model = whisper.load_model("medium").to(device)


def transcribe_audio(audio_path: str):
    result = model.transcribe(
        audio_path,
        language=None,        
        task="transcribe",
        fp16=(device == "cuda")
    )

    return {
        "text": result["text"].strip(),
        "language": result["language"],
        "segments": result["segments"]
    }