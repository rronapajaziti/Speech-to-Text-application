"use client";

import { useState } from "react";

type TabId = "audio" | "call" | "live";

export default function ProductionPage() {
  const [activeTab, setActiveTab] = useState<TabId>("audio");

  const tabClass = (tab: TabId) =>
    `px-4 py-3 text-sm font-medium border-b-2 transition ${
      activeTab === tab
        ? "border-[#001D3D] text-[#001D3D]"
        : "border-transparent text-[#64748B] hover:text-[#0F172A]"
    }`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex h-14 items-center justify-between rounded-xl border border-[#E7E5E4] bg-white px-5">
        <div className="text-sm text-[#64748B]">
          Project <span className="mx-2">/</span>
          <span className="font-medium text-[#0F172A]">Transcribe</span>
        </div>
        <button className="rounded-lg border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F5F5F4]">
          Search
        </button>
      </div>

      <header>
        <h1 className="text-3xl font-bold text-[#0F172A]">New transcription</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Transcribe audio files, uploaded call recordings, or capture live call audio.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E7E5E4] px-3">
          <button onClick={() => setActiveTab("audio")} className={tabClass("audio")}>
            Audio file
          </button>
          <button onClick={() => setActiveTab("call")} className={tabClass("call")}>
            Call recording
          </button>
          <button onClick={() => setActiveTab("live")} className={tabClass("live")}>
            Live call
          </button>
          <div className="ml-auto px-2 text-xs text-[#64748B]">
            Whisper · diarization online
          </div>
        </div>

        {activeTab === "audio" && (
          <div className="space-y-6 p-6">
            <div className="rounded-xl border-2 border-dashed border-[#BFD3FF] bg-[#EEF2FF] p-5">
              <p className="text-sm font-medium text-[#0F172A]">quarterly-review-apr22.mp3</p>
              <p className="mt-1 text-xs text-[#64748B]">2.4 MB · 04:37 · audio/mpeg</p>
              <div className="mt-3 h-10 rounded-md bg-gradient-to-r from-[#001D3D] via-[#355E8B] to-[#001D3D]" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-[#E7E5E4] bg-white p-3">
                <p className="text-xs text-[#64748B]">Language</p>
                <p className="mt-1 text-sm text-[#0F172A]">English</p>
              </div>
              <div className="rounded-lg border border-[#E7E5E4] bg-white p-3">
                <p className="text-xs text-[#64748B]">Model</p>
                <p className="mt-1 text-sm text-[#0F172A]">Whisper base · 74M</p>
              </div>
              <div className="rounded-lg border border-[#E7E5E4] bg-white p-3">
                <p className="text-xs text-[#64748B]">Output</p>
                <p className="mt-1 text-sm text-[#0F172A]">Plain text</p>
              </div>

            </div>

            <div className="flex items-center justify-between border-t border-[#E7E5E4] pt-2">
              <label className="inline-flex items-center gap-2 text-sm text-[#334155]">
                <input type="checkbox" defaultChecked className="accent-[#001D3D]" />
                Save to history
              </label>
              <div className="flex gap-2">
                <button className="rounded-md border border-[#E7E5E4] px-4 py-2 text-sm text-[#334155] hover:bg-[#F5F5F4]">
                  Cancel
                </button>
                <button className="rounded-md bg-[#001D3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0A2A52]">
                  Transcribe
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "call" && (
          <div className="space-y-6 p-6">
            <div className="rounded-xl border-2 border-dashed border-[#BDE9D3] bg-[#ECFDF3] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#0F172A]">support-call-2026-04-18.wav</p>
                <span className="rounded-full border border-[#00814D]/40 bg-white px-2 py-1 text-[11px] font-medium text-[#00814D]">
                  Diarization enabled
                </span>
              </div>
              <p className="mt-1 text-xs text-[#64748B]">8.1 MB · 12:04 · stereo · 2 channels detected</p>
              <div className="mt-3 h-10 rounded-md bg-gradient-to-r from-[#00814D] via-[#64B58E] to-[#00814D]" />
            </div>

            <div className="rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Call metadata</p>
                <span className="text-[11px] text-[#64748B]">Optional — improves speaker labeling</span>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-[#E7E5E4] bg-white p-3 text-xs text-[#334155]">Direction: Inbound</div>
                <div className="rounded-lg border border-[#E7E5E4] bg-white p-3 text-xs text-[#334155]">Date: Apr 18, 2026</div>
                <div className="rounded-lg border border-[#E7E5E4] bg-white p-3 text-xs text-[#334155]">Agent: Rrona P.</div>
                <div className="rounded-lg border border-[#E7E5E4] bg-white p-3 text-xs text-[#334155]">Caller: +1 415 555 0147</div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-[#E7E5E4] bg-white p-3 text-xs text-[#334155]">Language: English</div>
                <div className="rounded-lg border border-[#E7E5E4] bg-white p-3 text-xs text-[#334155]">Model: Whisper base</div>
                <div className="rounded-lg border border-[#E7E5E4] bg-white p-3 text-xs text-[#334155]">Diarization: 2 speakers</div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#E7E5E4] pt-2">
              <label className="inline-flex items-center gap-2 text-sm text-[#334155]">
                <input type="checkbox" defaultChecked className="accent-[#001D3D]" />
                Save to history
              </label>
              <div className="flex gap-2">
                <button className="rounded-md border border-[#E7E5E4] px-4 py-2 text-sm text-[#334155] hover:bg-[#F5F5F4]">
                  Cancel
                </button>
                <button className="rounded-md bg-[#00814D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#006C40]">
                  Transcribe call
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "live" && (
          <div className="space-y-6 p-6">
            <div className="rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                    LIVE
                  </span>
                  <span className="font-mono text-2xl font-semibold text-[#0F172A]">02:47</span>
                </div>
                <span className="text-xs text-[#64748B]">Good signal · 48 kHz</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-[#BFD3FF] bg-[#EEF2FF] p-3 text-sm text-[#1E3A8A]">AGENT · speaking</div>
                <div className="rounded-lg border border-[#BDE9D3] bg-[#ECFDF3] p-3 text-sm text-[#065F46]">CALLER · listening</div>
              </div>
              <div className="mt-4 rounded-lg border border-[#E7E5E4] bg-white p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#64748B]">Live transcript</p>
                <div className="space-y-3 font-mono text-sm">
                  <p className="text-[#334155]"><span className="mr-2 text-[#1E3A8A]">00:02 AGENT</span>Hi, thanks for calling support. How can I help today?</p>
                  <p className="text-[#334155]"><span className="mr-2 text-[#00814D]">00:09 CALLER</span>I have issues uploading a recording from yesterday.</p>
                  <p className="text-[#334155]"><span className="mr-2 text-[#1E3A8A]">02:47 AGENT</span>Alright, let me check upload logs on our side.</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <button className="rounded-md border border-[#E7E5E4] px-3 py-2 text-xs text-[#334155] hover:bg-[#F5F5F4]">Mute</button>
                  <button className="rounded-md border border-[#E7E5E4] px-3 py-2 text-xs text-[#334155] hover:bg-[#F5F5F4]">Hold</button>
                  <button className="rounded-md border border-[#E7E5E4] px-3 py-2 text-xs text-[#334155] hover:bg-[#F5F5F4]">Transfer</button>
                </div>
                <button className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                  End call
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E7E5E4] p-4">
          <p className="text-sm font-medium text-[#0F172A]">Call transcribed · 2 speakers detected</p>
          <div className="flex gap-1">
            <button className="rounded px-2 py-1 text-xs text-[#334155] hover:bg-[#F5F5F4]">Copy</button>
            <button className="rounded px-2 py-1 text-xs text-[#334155] hover:bg-[#F5F5F4]">Download .txt</button>
            <button className="rounded px-2 py-1 text-xs text-[#334155] hover:bg-[#F5F5F4]">Download .srt</button>
            <button className="rounded bg-[#EEF2FF] px-2 py-1 text-xs text-[#1E3A8A] hover:bg-[#E0E7FF]">Evaluate</button>
          </div>
        </div>
        <div className="space-y-4 p-5 font-mono text-sm">
          <div className="border-l-2 border-[#1E3A8A] pl-4">
            <p className="text-xs text-[#64748B]">00:02</p>
            <p className="text-xs font-semibold text-[#1E3A8A]">AGENT · Rrona P.</p>
            <p className="mt-1 text-[#334155]">Hi, thanks for calling support. This is Rrona - how can I help you today?</p>
          </div>
          <div className="border-l-2 border-[#00814D] pl-4">
            <p className="text-xs text-[#64748B]">00:09</p>
            <p className="text-xs font-semibold text-[#00814D]">CALLER · +1 415 555 0147</p>
            <p className="mt-1 text-[#334155]">I've been having trouble uploading a call recording from yesterday. It stays at ninety-nine percent.</p>
          </div>
          <div className="border-l-2 border-[#1E3A8A] pl-4">
            <p className="text-xs text-[#64748B]">00:24</p>
            <p className="text-xs font-semibold text-[#1E3A8A]">AGENT</p>
            <p className="mt-1 text-[#334155]">Can you confirm the file size, format, and whether you're on web or desktop?</p>
          </div>
        </div>
      </section>
    </div>
  );
}
