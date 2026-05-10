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
  cer: number;
  mer: number;
  wil: number;
  wip: number;
  hits: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  valid: boolean;
  alignment: {
    word: string | null;
    type: "correct" | "wrong" | "missing" | "extra";
  }[];
};

function normalizeAlignmentType(
  value: string | null | undefined,
): "correct" | "wrong" | "missing" | "extra" {
  const type = (value || "").toLowerCase().trim();
  if (type === "correct" || type === "hit" || type === "equal")
    return "correct";
  if (
    type === "wrong" ||
    type === "substitution" ||
    type === "substitute" ||
    type === "replace"
  ) {
    return "wrong";
  }
  if (type === "missing" || type === "deletion" || type === "delete") {
    return "missing";
  }
  return "extra";
}

export default function EvaluationPage() {
  const apiBase = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // TODO(auth): JWT will be added later. For now we hardcode the user.
  // const token = localStorage.getItem("access");
  const [userId, setUserId] = useState<number>(1);
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
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
  const [isGeneratingStats, setIsGeneratingStats] = useState(false);
  const [stats, setStats] = useState<AsrStats | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

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

  async function loadUsersFromApi(): Promise<BackendUser[]> {
    const res = await fetch(`${apiBase}/users/public/`);
    if (!res.ok) return [];
    return (await res.json()) as BackendUser[];
  }

  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      try {
        const list = await loadUsersFromApi();
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

  async function createUser() {
    const username = newUsername.trim();
    const password = newPassword.trim();
    const email = newEmail.trim();
    if (!username || !password) {
      setMessage("Username and password are required to create a user.");
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await fetch(`${apiBase}/users/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          email: email || "",
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to create user.");
      }

      const list = await loadUsersFromApi();
      setUsers(list);
      const created = list.find((u) => u.username === username);
      if (created) setUserId(created.id);

      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      setMessage(`User "${username}" created.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create user.");
    } finally {
      setIsCreatingUser(false);
    }
  }

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

  const werPercent = useMemo(() => {
    const value = (stats?.wer ?? 0) * 100;
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  }, [stats?.wer]);
  // Calculate readable stats for the UI
  const readableStats = stats
    ? (() => {
        const total =
          stats.hits + stats.substitutions + stats.deletions + stats.insertions;

        const accuracy = total > 0 ? (stats.hits / total) * 100 : 0;

        return {
          accuracy,
          errorRate: (stats.wer ?? 0) * 100,
          correctWords: stats.hits,
          totalMistakes:
            stats.substitutions + stats.deletions + stats.insertions,
        };
      })()
    : null;

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
      const modelMap: Record<string, string> = {
        google: "google",
        base: "whisper-base",
        small: "whisper-small",
        medium: "whisper-medium",
      };
      formData.append("model_name", modelMap[modelName] ?? modelName);

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
      setMessage(error instanceof Error ? error.message : "Upload failed.");
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

      const data = (await res.json()) as {
        wer: number;
        cer: number;
        mer: number | null;
        wil: number | null;
        wip: number | null;
        hits: number;
        substitutions: number;
        deletions: number;
        insertions: number;
        alignment?: { word?: string | null; type?: string | null }[];
      };

      setStats({
        wer: data.wer,
        cer: data.cer,
        mer: data.mer ?? 0,
        wil: data.wil ?? 0,
        wip: data.wip ?? 0,
        hits: data.hits ?? 0,
        substitutions: data.substitutions ?? 0,
        deletions: data.deletions ?? 0,
        insertions: data.insertions ?? 0,
        valid: true,
        alignment: Array.isArray(data.alignment)
          ? data.alignment.map((item) => ({
              word: item.word ?? null,
              type: normalizeAlignmentType(item.type),
            }))
          : [],
      });
    } catch (err) {
      console.error(err);
      setMessage("Failed to save evaluation");
    }
  }

  async function generateStats() {
    if (!transcription?.id || loadingStats) return;

    setLoadingStats(true);
    setIsGeneratingStats(true);
    setMessage("Loading evaluation...");

    try {
      const res = await fetch(
        `${apiBase}/evaluation-results/?transcription_id=${transcription.id}`,
      );

      if (!res.ok) throw new Error("Failed to fetch evaluation results");

      const data = await res.json();

      // If backend returns array, take first item
      const result = Array.isArray(data) ? data[0] : data;

      if (!result) throw new Error("No evaluation data found");

      setStats({
        wer: result.wer,
        cer: result.cer,
        mer: result.mer,
        wil: result.wil,
        wip: result.wip,
        hits: result.hits,
        substitutions: result.substitutions,
        deletions: result.deletions,
        insertions: result.insertions,
        valid: true,
        alignment: Array.isArray(result.alignment)
          ? result.alignment.map(
              (item: { word?: string | null; type?: string | null }) => ({
                word: item.word ?? null,
                type: normalizeAlignmentType(item.type),
              }),
            )
          : [],
      });

      setMessage("Stats loaded successfully.");
    } catch (e) {
      console.error(e);
      setMessage("Failed to load stats");
    } finally {
      setLoadingStats(false);
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
            <div className="mt-3 rounded-lg border border-[#E7E5E4] bg-white p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Create user
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Username *"
                  className="rounded-md border border-[#E7E5E4] bg-white px-2 py-1.5 text-xs text-[#0F172A] outline-none"
                />
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="rounded-md border border-[#E7E5E4] bg-white px-2 py-1.5 text-xs text-[#0F172A] outline-none"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password *"
                  className="rounded-md border border-[#E7E5E4] bg-white px-2 py-1.5 text-xs text-[#0F172A] outline-none"
                />
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={createUser}
                  disabled={isCreatingUser}
                  className="rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#F5F5F4] disabled:opacity-60"
                >
                  {isCreatingUser ? "Creating..." : "Create user"}
                </button>
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
                      <option value="">Select dialect / accent</option>

                      {/* ===================== ALBANIAN (KOSOVO CORE) ===================== */}
                      <optgroup label="Albanian (Kosovo)">
                        <option value="sq_kosovo_standard">
                          Kosovo Standard Albanian
                        </option>
                        <option value="sq_prishtina">
                          Prishtina Urban Accent
                        </option>
                        <option value="sq_gjakova">Gjakova Accent</option>
                        <option value="sq_peja">Peja Accent</option>
                        <option value="sq_mitrovica">Mitrovica Accent</option>
                        <option value="sq_south_kosovo">
                          Southern Kosovo Accent
                        </option>
                      </optgroup>

                      {/* ===================== ENGLISH (KOSOVO SPEAKERS) ===================== */}
                      <optgroup label="English (Kosovo Speakers)">
                        <option value="en_kosovo_beginner">
                          Kosovo English (A1–A2, strong Albanian influence)
                        </option>
                        <option value="en_kosovo_intermediate">
                          Kosovo English (B1–B2, moderate accent)
                        </option>
                        <option value="en_kosovo_fluent">
                          Kosovo English (C1–C2, near-native but non-native
                          rhythm)
                        </option>
                        <option value="en_kosovo_code_switch">
                          Code-switching English–Albanian (mixed speech)
                        </option>
                      </optgroup>

                      {/* ===================== GERMAN ===================== */}
                      <optgroup label="German">
                        <option value="de_standard">
                          Standard German (Hochdeutsch)
                        </option>

                        {/* native speakers included */}
                        <option value="de_germany_native">
                          Native German (Germany - mixed regions)
                        </option>

                        <option value="de_swiss_native">
                          Swiss German (Native - Schweiz)
                        </option>
                        <option value="de_swiss_zurich">
                          Swiss German (Zürich dialect)
                        </option>

                        <option value="de_austrian">
                          Austrian German (Vienna / Austria)
                        </option>
                      </optgroup>

                      {/* ===================== TURKISH ===================== */}
                      <optgroup label="Turkish">
                        <option value="tr_standard">
                          Standard Turkish (Istanbul)
                        </option>

                        {/* include native speakers explicitly */}
                        <option value="tr_native_istanbul">
                          Native Istanbul Turkish
                        </option>
                        <option value="tr_native_ankara">
                          Native Ankara Turkish
                        </option>

                        <option value="tr_anatolian">
                          Anatolian regional Turkish
                        </option>
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-5">
                <button
                  onClick={generateStats}
                  disabled={isGeneratingStats || !transcription?.id}
                  className="rounded-lg border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#F5F5F4] disabled:opacity-60"
                >
                  {isGeneratingStats ? "Generating..." : "Generate stats"}
                </button>
                <button
                  onClick={uploadAndTranscribe}
                  disabled={
                    isUploading || duration === null || !referenceText.trim()
                  }
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
              {stats?.wer !== null && stats?.wer !== undefined
                ? `${(stats?.wer * 100).toFixed(2)}%`
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
                  className={`h-70 w-full resize-none rounded-xl border p-4 text-base leading-7 outline-none ${
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
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                    Transcription output
                  </p>
                  {process.env.NODE_ENV !== "production" && (
                    <span className="rounded-md border border-[#E7E5E4] bg-[#F8FAFC] px-2 py-1 text-[10px] font-medium text-[#475569]">
                      align:
                      {Array.isArray(stats?.alignment)
                        ? ` ${stats.alignment.length}`
                        : " 0"}{" "}
                      | c:
                      {stats?.alignment?.filter((w) => w.type === "correct")
                        .length ?? 0}{" "}
                      w:
                      {stats?.alignment?.filter((w) => w.type === "wrong")
                        .length ?? 0}{" "}
                      m:
                      {stats?.alignment?.filter((w) => w.type === "missing")
                        .length ?? 0}{" "}
                      e:
                      {stats?.alignment?.filter((w) => w.type === "extra")
                        .length ?? 0}
                    </span>
                  )}
                </div>
                <div className="h-70 overflow-auto rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 text-base leading-8">
                  <div className="flex flex-wrap gap-x-2 gap-y-2">
                    {Array.isArray(stats?.alignment) &&
                    stats.alignment.length > 0 ? (
                      stats.alignment.map((item, idx) => {
                        const type = normalizeAlignmentType(item.type);

                        const colorClass =
                          type === "correct"
                            ? "bg-[#d9ead3] text-gray-900 rounded-md px-1.5 py-0.5"
                            : type === "wrong"
                              ? "bg-[#f4cccc] text-gray-900 rounded-md px-1.5 py-0.5 font-semibold"
                              : type === "missing"
                                ? "bg-[#fff2cc] text-gray-900 rounded-md px-1.5 py-0.5 font-semibold"
                                : "bg-[#d0e0e3] text-gray-900 rounded-md px-1.5 py-0.5 font-semibold";

                        return (
                          <span
                            key={idx}
                            className={`${colorClass} inline-block`}
                          >
                            {item.word ?? "[missing]"}
                          </span>
                        );
                      })
                    ) : transcription?.raw_text ? (
                      transcription.raw_text.split(" ").map((word, i) => (
                        <span key={i} className="text-[#334155] inline-block">
                          {word}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#64748B]">
                        No transcription available
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-sm">
        {stats && readableStats && (
          <div className="border-t border-[#E7E5E4] p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Evaluation Summary
              </p>
              <p className="text-xs text-[#64748B]">
                Accuracy {readableStats.accuracy.toFixed(1)}%
              </p>
            </div>

            {/* Main stats */}
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
              <div className="rounded-lg bg-[#F5F5F4] p-3">
                <div className="text-xs text-[#64748B]">Accuracy</div>
                <div className="font-semibold text-[#0F172A]">
                  {readableStats.accuracy.toFixed(1)}%
                </div>
              </div>

              <div className="rounded-lg bg-[#F5F5F4] p-3">
                <div className="text-xs text-[#64748B]">Error Rate</div>
                <div className="font-semibold text-[#0F172A]">
                  {readableStats.errorRate.toFixed(1)}%
                </div>
              </div>

              <div className="rounded-lg bg-[#F5F5F4] p-3">
                <div className="text-xs text-[#64748B]">Correct Words</div>
                <div className="font-semibold text-[#0F172A]">
                  {readableStats.correctWords}
                </div>
              </div>

              <div className="rounded-lg bg-[#F5F5F4] p-3">
                <div className="text-xs text-[#64748B]">Total Mistakes</div>
                <div className="font-semibold text-[#0F172A]">
                  {readableStats.totalMistakes}
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-[#F5F5F4] p-2">
                <div className="text-[#64748B]">Wrong Words</div>
                <div className="font-semibold">{stats.substitutions}</div>
              </div>

              <div className="rounded-lg bg-[#F5F5F4] p-2">
                <div className="text-[#64748B]">Missing Words</div>
                <div className="font-semibold">{stats.deletions}</div>
              </div>

              <div className="rounded-lg bg-[#F5F5F4] p-2">
                <div className="text-[#64748B]">Extra Words</div>
                <div className="font-semibold">{stats.insertions}</div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
