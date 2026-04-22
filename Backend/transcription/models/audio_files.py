from django.db import models
from django.contrib.auth.models import User

from .language import Language


class AudioFiles(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    audio_file = models.FileField(upload_to="audio/", null=True, blank=True)
    file_name = models.CharField(max_length=50)
    file_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)
    duration = models.FloatField(help_text="Duration in seconds")
    language = models.ForeignKey(Language, on_delete=models.CASCADE)
    date_uploaded = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_name
