from django.db import models

from .transcription import Transcription


class EvaluationResults(models.Model):
    transcription = models.ForeignKey(
        Transcription,
        on_delete=models.CASCADE,
        db_index=True
    )

    gender = models.CharField(max_length=20, null=True, blank=True)
    dialect = models.CharField(max_length=50, null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)

    wer = models.FloatField()
    cer = models.FloatField(null=True, blank=True)
    mer = models.FloatField(null=True, blank=True)
    wil = models.FloatField(null=True, blank=True)
    wip = models.FloatField(null=True, blank=True)

    hits = models.IntegerField(default=0)
    substitutions = models.IntegerField(default=0)
    deletions = models.IntegerField(default=0)
    insertions = models.IntegerField(default=0)

    alignment = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def accuracy(self):
        return max(0.0, 1.0 - self.wer)