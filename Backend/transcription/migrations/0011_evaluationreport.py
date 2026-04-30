from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("transcription", "0010_evaluationresults_age"),
    ]

    operations = [
        migrations.CreateModel(
            name="EvaluationReport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("report_name", models.CharField(max_length=150)),
                ("report_data", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "evaluation_result",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="transcription.evaluationresults",
                    ),
                ),
                (
                    "transcription",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="transcription.transcription",
                    ),
                ),
            ],
        ),
    ]
