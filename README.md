# Scribe — Speech-to-Text Evaluation Platform

A full-stack web application for automatic speech recognition (ASR) transcription and evaluation, developed as a Bachelor's thesis at the Faculty of Computer Science and Engineering.

---

## Overview

Scribe allows users to upload audio recordings, transcribe them using Google Cloud Speech-to-Text or OpenAI Whisper, and evaluate transcription quality using standard ASR metrics (WER, CER, MER, WIL). The platform supports multilingual audio (Albanian, English, German, Turkish) and provides a statistics dashboard for analysing performance across gender, age, dialect, and language.

---

## Tech Stack

| Layer            | Technology                                                  |
| ---------------- | ----------------------------------------------------------- |
| Frontend         | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS |
| Backend          | Django 5.2, Django REST Framework, SimpleJWT                |
| Database         | PostgreSQL 15 (SQLite fallback for development)             |
| ASR Engines      | Google Cloud Speech-to-Text API, OpenAI Whisper             |
| Metrics          | jiwer (WER, CER, MER, WIL, WIP)                             |
| Containerisation | Docker + Docker Compose                                     |

---

## Project Structure

```
Speech-to-Text-application/
├── Backend/
│   ├── config/                  # Django settings, URLs, WSGI
│   ├── transcription/
│   │   ├── controllers/         # API view controllers
│   │   ├── models/              # Django ORM models
│   │   ├── services/            # Pipeline, Whisper, Google, evaluation logic
│   │   └── utils/               # WER/CER metrics
│   ├── manage.py
│   └── requirements.txt
├── Frontend/
│   ├── app/
│   │   ├── dashboard/           # Dashboard + Stats pages
│   │   ├── evaluation/          # Evaluation form + history
│   │   ├── login/               # Authentication
│   │   ├── components/          # Sidebar, AppShell
│   │   └── lib/                 # Auth utilities (token refresh)
│   ├── package.json
│   └── next.config.ts
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15 (or use SQLite for local dev)
- Google Cloud credentials (for Google ASR)
- ffmpeg (required by Whisper for audio processing)

### Backend Setup

```bash
cd Backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt

cp .env.example .env         # fill in your values

python manage.py migrate
python manage.py runserver
```

### Frontend Setup

```bash
cd Frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_BASE_URL

npm run dev
```

### Environment Variables

**Backend `.env`**

```
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=postgresql://user:password@localhost:5432/scribe
FRONTEND_URL=http://localhost:3000
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
```

**Frontend `.env.local`**

```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

---

## Features

- Upload audio files (mp4, wav, mp3, m4a)
- Transcribe with Google Cloud Speech-to-Text or OpenAI Whisper
- Evaluate against a reference text (WER, CER, MER, WIL, WIP)
- Word-level alignment visualisation (correct / substitution / deletion / insertion)
- Evaluation history with pagination
- Dashboard: workflow status, WER range, model × language comparison table
- Stats: WER distribution, error breakdown, gender / age / dialect / language analysis
- JWT authentication with automatic token refresh and auto-logout
- Duplicate audio detection via SHA-256 hash

---

## ASR Models

| Model                       | Languages                          | Notes                                     |
| --------------------------- | ---------------------------------- | ----------------------------------------- |
| Google Cloud Speech-to-Text | Albanian, English, German, Turkish | Primary model, best multilingual accuracy |
| OpenAI Whisper (medium)     | English, German, Turkish           | Local inference, comparison/testing role  |

---

## Evaluation Metrics

| Metric   | Description                                                                        |
| -------- | ---------------------------------------------------------------------------------- |
| WER      | Word Error Rate — (substitutions + deletions + insertions) / total reference words |
| CER      | Character Error Rate — same calculation at character level                         |
| MER      | Match Error Rate — proportion of reference words involved in an error              |
| WIL      | Word Information Lost                                                              |
| WIP      | Word Information Preserved (1 − WIL)                                               |
| Accuracy | (1 − WER) × 100                                                                    |

---

## Author

**Rrona Pajaziti**
Bachelor of Computer Science and Engineering
