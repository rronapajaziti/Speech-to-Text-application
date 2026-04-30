"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type BackendTranscription = {
  id: number;
  audio_id: number;
  audio_file_name: string;
  raw_text: string;
  reference_text: string | null;
  wer_score: number | null;
  status: string;
  model_name: string;
  date_created: string;
};

type BackendAudioFile = {
  id: number;
  user: number;
  audio_file: string | null;
  file_name: string;
  duration: number;
  language: number;
  date_uploaded: string;
};

type BackendLanguage = {
  id: number;
  language_name: string;
  code: string;
};

type BackendUser = {
  id: number;
  username: string;
  email?: string;
};

type AsrStats = {
  wer: number;
  mer: number;
  wil: number;
  wip: number;
  cer: number;
  hits: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  valid: boolean;
};

export default function EvaluationPage() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // TODO(auth): JWT will be added later. For now we hardcode the user.
  // const token = localStorage.getItem("access");
  const [userId, setUserId] = useState<number>(1);
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [languageId, setLanguageId] = useState<number>(1);
  const [languageLabel, setLanguageLabel] = useState<string>("Auto");
  const [languages, setLanguages] = useState<BackendLanguage[]>([]);
  const [modelName, setModelName] = useState<string>("google");
  const [duration, setDuration] = useState<number | null>(null);
  const [referenceText, setReferenceText] = useState("");
  const [gender, setGender] = useState<string>("");
  const [age, setAge] = useState<number | "">("");
  const [dialect, setDialect] = useState<string>("");
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [transcription, setTranscription] =
    useState<BackendTranscription | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0); // 0..1
  const [localAudioObjectUrl, setLocalAudioObjectUrl] = useState<string | null>(
    null,
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const [eqLevel, setEqLevel] = useState(0); // 0..1
  const [isUploading, setIsUploading] = useState(false);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [isGeneratingStats, setIsGeneratingStats] = useState(false);
  const [stats, setStats] = useState<AsrStats | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function resolveBackendUrl(value: string) {
    if (/^https?:\/\//i.test(value)) return value;
    const base = apiBase.replace(/\/$/, "");
    const path = value.startsWith("/") ? value : `/${value}`;
    return `${base}${path}`;
  }

  async function computeAudioDurationSeconds(file: File): Promise<number> {
    const objectUrl = URL.createObjectURL(file);
    try {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.src = objectUrl;
      const durationSec = await new Promise<number>((resolve, reject) => {
        const onLoaded = () => {
          cleanup();
          resolve(audio.duration);
        };
        const onError = () => {
          cleanup();
          reject(new Error("Unable to read audio duration."));
        };
        const cleanup = () => {
          audio.removeEventListener("loadedmetadata", onLoaded);
          audio.removeEventListener("error", onError);
        };
        audio.addEventListener("loadedmetadata", onLoaded);
        audio.addEventListener("error", onError);
      });
      return Number.isFinite(durationSec) ? Math.max(0, durationSec) : 0;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function sha256Hex(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  useEffect(() => {
    if (!selectedFile) {
      setLocalAudioObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setLocalAudioObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      try {
        const res = await fetch(`${apiBase}/users/public/`);
        if (!res.ok) return;
        const list = (await res.json()) as BackendUser[];
        if (cancelled) return;
        setUsers(list);
        if (list.length && !list.some((u) => u.id === userId)) {
          setUserId(list[0].id);
        }
      } catch {
        // ignore
      }
    }
    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [apiBase, userId]);

  async function loadLanguages(): Promise<BackendLanguage[]> {
    if (languages.length) return languages;
    const res = await fetch(`${apiBase}/languages/`);
    if (!res.ok) return [];
    const list = (await res.json()) as BackendLanguage[];
    setLanguages(list);
    return list;
  }

  async function detectLanguageAfterFileSelected() {
    try {
      const list = await loadLanguages();
      if (!list.length) return;
      const browser = (navigator.language || "").toLowerCase();
      const browserBase = browser.split("-")[0];
      const pick =
        list.find((l) => l.code.toLowerCase() === browser) ??
        list.find((l) => l.code.toLowerCase() === browserBase) ??
        list.find((l) => l.id === 1) ??
        list[0];
      if (!pick) return;
      setLanguageId(pick.id);
      setLanguageLabel(`${pick.language_name} (${pick.code})`);
    } catch {
      // ignore
    }
  }

  async function ensureAnalyserConnected() {
    const el = audioRef.current;
    if (!el) return;

    if (!audioContextRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      audioContextRef.current = new Ctx();
    }

    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();

    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;

      const src = ctx.createMediaElementSource(el);
      src.connect(analyser);
      analyser.connect(ctx.destination);

      analyserRef.current = analyser;
    }
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      analyserRef.current = null;
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadLanguages() {
      try {
        const res = await fetch(`${apiBase}/languages/`);
        if (!res.ok) return;
        const list = (await res.json()) as BackendLanguage[];
        const browser = (navigator.language || "").toLowerCase(); // e.g. en-us
        const browserBase = browser.split("-")[0];

        const pick =
          list.find((l) => l.code.toLowerCase() === browser) ??
          list.find((l) => l.code.toLowerCase() === browserBase) ??
          list.find((l) => l.id === 1) ??
          list[0];

        if (!pick || cancelled) return;
        setLanguageId(pick.id);
        setLanguageLabel(`${pick.language_name} (${pick.code})`);
      } catch {
        // keep default
      }
    }
    void loadLanguages();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const werPercent = useMemo(() => {
    const value = (transcription?.wer_score ?? 0) * 100;
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  }, [transcription?.wer_score]);

  async function uploadAndTranscribe() {
    if (!selectedFile) {
      setMessage("Select an audio file to upload.");
      return;
    }

    // ✅ VALIDATION HERE
    if (!referenceText.trim()) {
      setReferenceError("Reference text is required.");
      setMessage("Reference text is required.");
      return;
    } else {
      setReferenceError(null);
    }

    if (duration === null) {
      setMessage("Reading audio duration... try again in a moment.");
      return;
    }

    setIsUploading(true);
    setMessage("Uploading file and running backend transcription...");
    try {
      const formData = new FormData();
      formData.append("user", String(userId));
      formData.append("audio_file", selectedFile);
      formData.append("file_name", selectedFile.name);
      formData.append("duration", String(duration));
      formData.append("language", String(languageId));
      formData.append("run_transcription", "1");
      formData.append("reference_text", referenceText.trim());
      formData.append("mode", "evaluate");
      formData.append("dialect", dialect);
      formData.append("model_name", modelName);

      const response = await fetch(`${apiBase}/audio-files/create/`, {
        method: "POST",
        // headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Upload failed.");
      }
      const payload = (await response.json()) as {
        audio_file?: BackendAudioFile;
        transcription?: BackendTranscription | null;
        reused?: boolean;
      };
      console.log("Sending to backend:", {
        languages,
        gender,
        dialect,
        age,
      });
      const next = payload?.transcription as BackendTranscription | null;
      if (!next) {
        throw new Error("Backend did not return transcription data.");
      }
      setTranscription(next);
      setReferenceText(next.reference_text ?? referenceText);
      await saveEvaluation(next.id);
      const audioField = payload?.audio_file?.audio_file;
      if (audioField) setAudioUrl(resolveBackendUrl(audioField));
      setMessage(
        `Transcription #${next.id} ready.${payload?.reused ? " (reused saved audio)" : ""}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function saveEvaluation(transcriptionId: number) {
    try {
      const res = await fetch(`${apiBase}/evaluation-results/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcription_id: transcriptionId,
          gender,
          dialect,
          age: age === "" ? null : age,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const data = await res.json();
      console.log("Evaluation saved:", data);
    } catch (err) {
      console.error(err);
      setMessage("Failed to save evaluation");
    }
  }

  async function generateStats() {
    if (!transcription?.id) {
      setMessage("Generate a transcription first.");
      return;
    }
    if (!referenceText.trim()) {
      setMessage("Reference text is required.");
      return;
    }
    if (!transcription.raw_text?.trim()) {
      setMessage("No transcription output yet.");
      return;
    }

    setIsGeneratingStats(true);
    setMessage("Generating stats...");
    try {
      const res = await fetch(
        `${apiBase}/transcriptions/stats/${transcription.id}/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference_text: referenceText.trim(),
            hypothesis_text: transcription.raw_text,
          }),
        },
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to generate stats.");
      }
      const payload = (await res.json()) as { stats: AsrStats };
      setStats(payload.stats);
      setMessage("Stats updated.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to generate stats.");
    } finally {
      setIsGeneratingStats(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex h-14 items-center justify-between rounded-xl border border-[#E7E5E4] bg-white px-5">
        <div className="text-sm text-[#64748B]">
          Project <span className="mx-2">/</span>
          <span className="font-medium text-[#0F172A]">Evaluation</span>
        </div>
        <Link
          href="/evaluation/history"
          className="rounded-lg border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F5F5F4]"
        >
          Open history
        </Link>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#64748B]">
            History / {transcription?.audio_file_name || "new-upload"}
          </p>
          <h1 className="text-3xl font-bold text-[#0F172A]">
            Audio Evaluation
          </h1>
          <p className="text-sm text-[#64748B]">
            Upload a file, transcribe, then evaluate with required reference
            text.
          </p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-sm">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              Audio file
            </label>
            <input
              type="file"
              accept="audio/*"
              className="mt-2 w-full rounded-lg border border-[#E7E5E4] bg-white p-2 text-sm text-[#334155]"
              onChange={async (event) => {
                const file = event.target.files?.[0] ?? null;

                setSelectedFile(file);
                setAudioUrl(null);
                setDuration(null);

                // 🔥 Reset UI state
                setTranscription(null);
                setStats(null);
                setReferenceText("");
                setMessage(null);

                if (!file) return;

                try {
                  const dur = await computeAudioDurationSeconds(file);
                  setDuration(dur);
                  await detectLanguageAfterFileSelected();
                } catch (e) {
                  setDuration(0);
                  setMessage(
                    e instanceof Error
                      ? e.message
                      : "Failed to read file info.",
                  );
                }
              }}
            />

            <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-[#334155]">
              <div className="rounded-lg border border-[#E7E5E4] bg-white p-2">
                <div className="text-[#64748B]">User</div>
                <select
                  value={userId}
                  onChange={(e) => setUserId(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-xs font-medium text-[#0F172A] outline-none"
                >
                  {users.length ? (
                    users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))
                  ) : (
                    <option value={1}>user-1</option>
                  )}
                </select>
              </div>
              <div className="rounded-lg border border-[#E7E5E4] bg-white p-2">
                <div className="text-[#64748B]">Language</div>
                <select
                  value={languageId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setLanguageId(id);
                    const found = languages.find((l) => l.id === id);
                    if (found)
                      setLanguageLabel(
                        `${found.language_name} (${found.code})`,
                      );
                  }}
                  className="mt-1 w-full rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-xs font-medium text-[#0F172A] outline-none"
                >
                  {languages.length ? (
                    languages.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.language_name} ({l.code})
                      </option>
                    ))
                  ) : (
                    <option value={languageId}>{languageLabel}</option>
                  )}
                </select>
              </div>
              <div className="rounded-lg border border-[#E7E5E4] bg-white p-2">
                <div className="text-[#64748B]">Duration</div>
                <div className="font-medium text-[#0F172A]">
                  {duration === null ? "reading..." : `${duration.toFixed(2)}s`}
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-[#E7E5E4] bg-white p-2 text-xs text-[#334155]">
              <div className="text-[#64748B]">Transcription provider</div>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="mt-1 w-full rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-xs font-medium text-[#0F172A] outline-none"
              >
                <option value="google">Google ASR (recommended)</option>
                <option value="base">Whisper (base)</option>
                <option value="small">Whisper (small)</option>
                <option value="medium">Whisper (medium)</option>
              </select>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={async () => {
                  const el = audioRef.current;
                  if (!el) return;
                  if (!el.src) {
                    setMessage("Select an audio file first.");
                    return;
                  }
                  await ensureAnalyserConnected();
                  if (el.paused) void el.play();
                  else el.pause();
                }}
                disabled={!audioUrl && !selectedFile}
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
                className="group h-11 w-11 rounded-full bg-[#001D3D] text-white shadow-sm ring-1 ring-black/5 transition hover:bg-[#0A2A52] active:scale-[0.98] disabled:opacity-50 disabled:hover:bg-[#001D3D]"
              >
                <span className="text-sm font-semibold">
                  {isPlaying ? "❚❚" : "▶"}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  const el = audioRef.current;
                  if (!el || !Number.isFinite(el.duration) || el.duration <= 0)
                    return;
                  const rect = (
                    e.currentTarget as HTMLButtonElement
                  ).getBoundingClientRect();
                  const ratio = Math.min(
                    1,
                    Math.max(0, (e.clientX - rect.left) / rect.width),
                  );
                  el.currentTime = ratio * el.duration;
                }}
                disabled={!audioUrl && !selectedFile}
                aria-label="Seek audio"
                className="relative h-10 flex-1 overflow-hidden rounded-md bg-white disabled:opacity-50"
              >
                <span
                  className="absolute inset-0 opacity-30"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(2, 6, 23, 0.06), rgba(2, 6, 23, 0.02))",
                  }}
                />
                <span className="absolute inset-0 bg-black/0 hover:bg-black/5 transition" />

                <span
                  className="absolute inset-y-0 left-0 w-[2px] bg-[#1D4ED8]/60"
                  style={{ left: `${Math.round(audioProgress * 100)}%` }}
                />

                <span className="absolute inset-0 flex items-end justify-between gap-[2px] px-1.5 py-2">
                  {Array.from({ length: 26 }).map((_, i) => {
                    const base = 0.18 + (i % 7) * 0.08;
                    const wobble = 0.22 * Math.sin((i + 1) * 1.7);
                    const intensity = isPlaying ? eqLevel : 0.08;
                    const height = Math.min(
                      1,
                      Math.max(0.12, base + wobble + intensity * 1.05),
                    );
                    const lit = i / 26 <= audioProgress;
                    return (
                      <span
                        key={i}
                        className={
                          lit
                            ? "w-[3px] rounded-full bg-[#1D4ED8]"
                            : "w-[3px] rounded-full bg-[#93C5FD]"
                        }
                        style={{ height: `${Math.round(height * 100)}%` }}
                      />
                    );
                  })}
                </span>
              </button>
            </div>

            <audio
              id="evaluation-audio"
              ref={audioRef}
              className="sr-only"
              onPlay={() => {
                setIsPlaying(true);

                const tick = () => {
                  const analyser = analyserRef.current;
                  if (!analyser) {
                    rafRef.current = requestAnimationFrame(tick);
                    return;
                  }
                  const data = new Uint8Array(analyser.frequencyBinCount);
                  analyser.getByteFrequencyData(data);
                  let sum = 0;
                  for (let i = 0; i < data.length; i++) sum += data[i];
                  const avg = sum / (data.length * 255);
                  setEqLevel(avg);
                  rafRef.current = requestAnimationFrame(tick);
                };

                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                rafRef.current = requestAnimationFrame(tick);
              }}
              onPause={() => {
                setIsPlaying(false);
                setEqLevel(0);
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
              }}
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={() => {
                const el = audioRef.current;
                if (!el || !Number.isFinite(el.duration) || el.duration <= 0) {
                  setAudioProgress(0);
                  return;
                }
                setAudioProgress(el.currentTime / el.duration);
              }}
              onLoadedMetadata={() => setAudioProgress(0)}
              src={audioUrl ?? localAudioObjectUrl ?? undefined}
            />
            <div className="mt-4 space-y-2 text-sm text-[#334155]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">File</span>
                <span>
                  {selectedFile ? selectedFile.name : "No file selected"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Model</span>
                <span>{transcription?.model_name || "Waiting for upload"}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#64748B]">Status</span>
                <span>{transcription?.status || "Not processed"}</span>
              </div>
              <div className="space-y-4 mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  Evaluation settings
                </p>

                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="number"
                    value={age}
                    onChange={(e) =>
                      setAge(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="Age"
                    className="rounded-xl border border-[#E7E5E4] bg-white p-2 text-sm"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="rounded-xl border border-[#E7E5E4] bg-white p-2 text-sm"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>

                    <select
                      value={dialect}
                      onChange={(e) => setDialect(e.target.value)}
                      className="rounded-xl border border-[#E7E5E4] bg-white p-2 text-sm"
                    >
                      <option value="">Select dialect</option>

                      {/* Albanian */}
                      <option value="standard_albanian">
                        Standard Albanian
                      </option>
                      <option value="kosovo_albanian">Kosovo Albanian</option>
                      <option value="north_albanian">Northern Albanian</option>

                      {/* English */}
                      <option value="en_us">English (US)</option>
                      <option value="en_uk">English (UK)</option>

                      {/* Turkish */}
                      <option value="tr_standard">Turkish (Standard)</option>
                      <option value="tr_istanbul">
                        Turkish (Istanbul accent)
                      </option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-5">
                <button
                  onClick={generateStats}
                  disabled={isGeneratingStats}
                  className="rounded-lg border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#F5F5F4] disabled:opacity-60"
                >
                  {isGeneratingStats ? "Generating..." : "Generate stats"}
                </button>
                <button
                  onClick={uploadAndTranscribe}
                  disabled={isUploading}
                  className="rounded-lg bg-[#001D3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0A2A52] disabled:opacity-60"
                >
                  {isUploading ? "Processing..." : "Upload + Evaluate"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[#64748B]">
              Word error rate
            </p>
            <p className="mt-2 text-4xl font-semibold text-[#0F172A]">
              {transcription?.wer_score !== null &&
              transcription?.wer_score !== undefined
                ? `${(transcription.wer_score * 100).toFixed(2)}%`
                : "N/A"}
            </p>
            <p className="mt-1 text-xs text-[#00814D]">
              {werPercent < 15
                ? "Good"
                : werPercent < 30
                  ? "Fair"
                  : "Needs work"}
            </p>
            <div className="mt-3 h-1.5 rounded bg-[#E7E5E4]">
              <div
                className="h-full rounded bg-[#00814D]"
                style={{ width: `${werPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="h-full overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-sm">
            <div className="grid gap-4 p-4 md:grid-rows-2 mt-6">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  Reference text
                </p>
                <textarea
                  value={referenceText}
                  onChange={(event) => {
                    const value = event.target.value;
                    setReferenceText(value);

                    if (!value.trim()) {
                      setReferenceError("Reference text is required.");
                    } else {
                      setReferenceError(null);
                    }
                  }}
                  className={`h-44 w-full resize-none rounded-xl border p-3 text-sm outline-none ${
                    referenceError
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-[#E7E5E4] bg-[#FAFAF9] text-[#334155]"
                  }`}
                  placeholder="Paste reference text here..."
                />

                {referenceError && (
                  <p className="text-xs text-red-500 mt-1">{referenceError}</p>
                )}
              </div>

              <div className="space-y-2 mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  Transcription output
                </p>
                <div className="h-44 overflow-auto rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-3 text-sm leading-7 text-[#334155] whitespace-pre-wrap">
                  {transcription?.raw_text ||
                    "Upload and process an audio file to see transcription output."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-sm">
        {stats && (
          <div className="border-t border-[#E7E5E4] p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Stats
              </p>
              <p className="text-xs text-[#64748B]">
                WER {(stats.wer * 100).toFixed(2)}% · CER{" "}
                {(stats.cer * 100).toFixed(2)}%
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-[#0F172A] md:grid-cols-4">
              <div className="rounded-lg bg-[#F5F5F4] p-2">
                <div className="text-xs text-[#64748B]">MER</div>
                <div className="font-semibold">
                  {(stats.mer * 100).toFixed(2)}%
                </div>
              </div>
              <div className="rounded-lg bg-[#F5F5F4] p-2">
                <div className="text-xs text-[#64748B]">WIP</div>
                <div className="font-semibold">
                  {(stats.wip * 100).toFixed(2)}%
                </div>
              </div>
              <div className="rounded-lg bg-[#F5F5F4] p-2">
                <div className="text-xs text-[#64748B]">WIL</div>
                <div className="font-semibold">
                  {(stats.wil * 100).toFixed(2)}%
                </div>
              </div>
              <div className="rounded-lg bg-[#F5F5F4] p-2">
                <div className="text-xs text-[#64748B]">Hits</div>
                <div className="font-semibold">{stats.hits}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[#334155] md:grid-cols-4">
              <div className="rounded-lg bg-[#F5F5F4] p-2">
                <div className="text-[#64748B]">Sub</div>
                <div className="font-semibold text-[#0F172A]">
                  {stats.substitutions}
                </div>
              </div>
              <div className="rounded-lg bg-[#F5F5F4] p-2">
                <div className="text-[#64748B]">Del</div>
                <div className="font-semibold text-[#0F172A]">
                  {stats.deletions}
                </div>
              </div>
              <div className="rounded-lg bg-[#F5F5F4] p-2">
                <div className="text-[#64748B]">Ins</div>
                <div className="font-semibold text-[#0F172A]">
                  {stats.insertions}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
