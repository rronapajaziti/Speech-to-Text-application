from django.db import models


class Language(models.Model):
    language_name = models.CharField(max_length=50)
    code = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return f"{self.language_name} ({self.code})"
