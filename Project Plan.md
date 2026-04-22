# Speech-to-Text Application — Continuation Plan

_Last updated: 2026-04-22_

## Current state

**Backend (Django + DRF):** ~90% done. Models, migrations, controllers, serializers, JWT auth, Whisper pipeline, and WER evaluation are all in place.

**Frontend (Next.js + React + TS):** ~5% done. Only the stock Next.js boilerplate exists.

**Infra:** Dockerfile and docker-compose are set up; Postgres 15 runs in container.

---

## Phase 1 — Fix backend loose ends (half day)

These are small but will bite you later if ignored.

1. **Verify `requirements.txt`** — confirm `djangorestframework-simplejwt` is listed. Rebuild the Docker image and make sure `pip install -r requirements.txt` succeeds cleanly.
2. **Reconcile migrations with the split `models/` directory.** Run `python manage.py makemigrations` in a clean DB and check for phantom migrations. Consider squashing to a single clean migration before going further.
3. **Add CORS config.** Install `django-cors-headers`, add to `INSTALLED_APPS` and `MIDDLEWARE`, and set `CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]` in `settings.py`. Without this, the frontend cannot call the API from the browser.
4. **Lazy-load Whisper.** In `whisper_service.py`, move `whisper.load_model(...)` out of module scope into a function with a module-level cache (`_model = None`, load on first call). This keeps Django startup fast.
5. **Fix controllers missing `serializer.is_valid()` checks** — `addLanguage`, `addRole`, and the `EvaluationResults` POST. Return HTTP 400 on invalid input.
6. **Add `.env` / settings for `SECRET_KEY`, `DEBUG`, DB credentials** if not already externalized.

## Phase 2 — Minimum usable frontend (2–3 days)

Build the smallest UI that exercises the full pipeline end-to-end.

1. **Project skeleton**
   - Add an `lib/api.ts` module that wraps `fetch` with the backend base URL (from `NEXT_PUBLIC_API_URL`) and injects the JWT from `localStorage`.
   - Add a simple `AuthContext` to hold the logged-in user and token.

2. **Auth pages**
   - `/login` — email + password form, POSTs to `/api/users/login/`, stores token.
   - `/register` — creates a user via `/api/users/add/`.
   - Redirect unauthenticated users away from protected pages.

3. **Upload + transcribe page** (`/transcribe`)
   - File picker that accepts common audio formats (mp3, wav, m4a).
   - Optional: language dropdown populated from `/api/languages/`.
   - On submit, POST the file to the audio upload endpoint, then trigger the transcription pipeline.
   - Show a loading state while Whisper runs.
   - Render the returned transcript.

4. **History page** (`/history`)
   - List the logged-in user's past transcriptions with timestamp, filename, language, and WER score (if available).
   - Click into a row to see the full transcript and the reference text.

5. **Evaluation UI**
   - On a transcription detail page, allow the user to paste a reference transcript, submit it, and see the WER score returned by the backend.

## Phase 3 — Polish & quality (1–2 days)

1. **Backend tests** (`transcription/tests.py`)
   - Unit tests for the evaluation service (WER computation on known inputs).
   - API tests for the auth flow and the upload → transcribe → evaluate path using DRF's `APIClient`.
   - Mock Whisper in tests so they don't actually run the model.

2. **Frontend tests**
   - A handful of component tests with React Testing Library (login form, upload form).

3. **Error + loading states** across all frontend pages — never leave the UI silent.

4. **README**
   - How to run with Docker (`docker compose up`).
   - How to run backend and frontend separately for development.
   - API overview with a couple of `curl` examples.

## Phase 4 — Stretch goals (pick what fits your grading rubric)

- **In-browser recording** — use the MediaRecorder API so users can record audio directly instead of uploading.
- **Streaming / progress updates** — Server-Sent Events or WebSocket for long transcriptions.
- **Multiple Whisper model sizes** selectable per request (tiny / base / small / medium).
- **Speaker diarization** via `pyannote.audio`.
- **Export transcript** as `.txt` or `.srt` (subtitle).
- **Admin dashboard** showing aggregate WER across users/languages.
- **Deployment** — Fly.io / Railway for backend, Vercel for frontend.

---

## Suggested order for the next week

| Day | Focus                                                |
| --- | ---------------------------------------------------- |
| 1   | Phase 1 — backend cleanup + CORS                     |
| 2   | Phase 2.1–2.2 — API client + auth pages              |
| 3   | Phase 2.3 — upload & transcribe page (the core demo) |
| 4   | Phase 2.4–2.5 — history + evaluation UI              |
| 5   | Phase 3 — tests and README                           |
| 6+  | Phase 4 — pick 1–2 stretch features for bonus marks  |

## Git hygiene

You have three branches (`main`, `Feature/frontend-production-evaluation`, `Feature/postman-audio-transcription`). Before starting Phase 2, merge or close out the feature branches so you're not building on top of stale work.
