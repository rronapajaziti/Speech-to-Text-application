from django.db import models

from .transcription import Transcription


class EvaluationResults(models.Model):
    transcription = models.ForeignKey(Transcription, on_delete=models.CASCADE)
    accuracy_score = models.FloatField()
    error_rate = models.FloatField()
    evaluation_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Eval {self.id} – Acc {self.accuracy_score}"
