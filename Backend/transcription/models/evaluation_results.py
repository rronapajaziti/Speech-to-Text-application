from django.db import models

from .transcription import Transcription


class EvaluationResults(models.Model):
    transcription = models.ForeignKey(Transcription, on_delete=models.CASCADE)

    gender = models.CharField(max_length=20, null=True, blank=True)
    dialect = models.CharField(max_length=50, null=True, blank=True)

    wer = models.FloatField()
    cer = models.FloatField(null=True, blank=True)
    mer = models.FloatField(null=True, blank=True)
    wil = models.FloatField(null=True, blank=True)
    wip = models.FloatField(null=True, blank=True)
    accuracy = models.FloatField(default=0)

    hits = models.IntegerField(default=0)
    substitutions = models.IntegerField(default=0)
    deletions = models.IntegerField(default=0)
    insertions = models.IntegerField(default=0)

    evaluation_date = models.DateTimeField(auto_now_add=True)