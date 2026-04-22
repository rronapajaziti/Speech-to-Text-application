from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("transcription", "0006_transcription_model_name_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="audiofiles",
            name="file_hash",
            field=models.CharField(blank=True, db_index=True, default="", max_length=64),
        ),
    ]

