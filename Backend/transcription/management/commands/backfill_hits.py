from django.core.management.base import BaseCommand

from transcription.models import EvaluationResults
from transcription.utils.metrics import calculate_asr_stats


class Command(BaseCommand):
    help = "Backfill hits=0 rows in EvaluationResults with the correct word count."

    def add_arguments(self, parser):
        parser.add_argument(
            "--all",
            action="store_true",
            help="Recompute hits for every row, not just hits=0 rows.",
        )

    def handle(self, *args, **options):
        qs = EvaluationResults.objects.select_related("transcription")
        if not options["all"]:
            qs = qs.filter(hits=0)

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS("Nothing to backfill."))
            return

        self.stdout.write(f"Backfilling {total} row(s)...")

        updated = 0
        skipped = 0

        for ev in qs.iterator():
            tx = ev.transcription
            if not tx or not tx.reference_text or not tx.raw_text:
                skipped += 1
                continue

            stats = calculate_asr_stats(tx.reference_text, tx.raw_text)
            ev.hits = stats["hits"]
            ev.save(update_fields=["hits"])
            updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Updated: {updated}  Skipped (no reference/hypothesis): {skipped}"
            )
        )
