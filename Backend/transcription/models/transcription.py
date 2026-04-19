from django.db import models

from .audio_files import AudioFiles


class Transcription(models.Model):
    audio = models.ForeignKey(AudioFiles, on_delete=models.CASCADE)
    raw_text = models.TextField(help_text="Raw transcription output")
    final_text = models.TextField(help_text="Reviewed / corrected transcription", blank=True)

    reference_text = models.TextField(blank=True, null=True)
    # Error score
    wer_score = models.FloatField(blank=True, null=True)
    model_name = models.CharField(max_length=50, default="base", help_text="Whisper model used for transcription")

    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("processing", "Processing"),
            ("completed", "Completed"),
            ("failed", "Failed"),
        ],
        default="pending",
    )
    date_created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transcription {self.id} ({self.status})"
