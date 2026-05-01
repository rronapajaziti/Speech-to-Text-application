"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BackendEvaluationResult = {
  id: number;
  transcription: number; // transcription id
  wer: number;
  dialect: string | null;
  gender: string | null;
  age: number | null;
  evaluation_date: string;
};

export default function EvaluationHistoryPage() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

  const [rows, setRows] = useState<BackendEvaluationResult[]>([]);

  useEffect(() => {
  let cancelled = false;

  async function loadRows() {
    try {
      const res = await fetch(`${apiBase}/evaluation-results/`);
      if (!res.ok || cancelled) return;

      const list = (await res.json()) as BackendEvaluationResult[];

      const sorted = [...list].sort(
        (a, b) =>
          new Date(b.evaluation_date).getTime() -
          new Date(a.evaluation_date).getTime()
      );

      if (!cancelled) setRows(sorted);
    } catch {
      // ignore errors
    }
  }

  void loadRows();

  return () => {
    cancelled = true;
  };
}, [apiBase]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex h-14 items-center justify-between rounded-xl border border-[#E7E5E4] bg-white px-5">
        <div className="text-sm text-[#64748B]">
          Project <span className="mx-2">/</span>
          <span className="font-medium text-[#0F172A]">
            Evaluation History
          </span>
        </div>

        <Link
          href="/evaluation"
          className="rounded-lg border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F5F5F4]"
        >
          Back
        </Link>
      </div>

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-[#d6dee8] bg-white shadow-sm">
        <div className="p-5 border-b border-[#d6dee8]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
            Evaluation results history
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm text-[#334155]">
              <thead>
                <tr className="border-b border-[#d6dee8] text-xs text-[#64748B] bg-[#fafafa]">
                  <th className="px-2 py-2 text-left">Transcription ID</th>
                  <th className="px-2 py-2 text-left">Age</th>
                  <th className="px-2 py-2 text-left">Gender</th>
                  <th className="px-2 py-2 text-left">Dialect</th>
                  <th className="px-2 py-2 text-left">WER</th>
                  <th className="px-2 py-2 text-left">Date</th>
                  <th className="px-2 py-2 text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.length ? (
                  rows.map((r) => (
                    <tr
  key={r.id}
  className="border-b border-[#e2e8f0] hover:bg-[#f8fafc] transition"
>
                      <td className="px-3 py-3">#{r.transcription}</td>
                      <td className="px-3 py-3">{r.age ?? "N/A"}</td>
                      <td className="px-3 py-3">{r.gender ?? "N/A"}</td>
                      <td className="px-3 py-3">{r.dialect || "N/A"}</td>
                      <td className="px-3 py-3">
                        {(r.wer * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-3">
                        {new Date(r.evaluation_date).toLocaleString()}
                      </td>

                      <td className="px-3 py-3">
                        <Link
                          href={`/evaluation/${r.id}`}
                          className="rounded-md border border-[#E7E5E4] px-2 py-1 text-xs hover:bg-[#F5F5F4]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center text-[#94a3b8]"
                    >
                      No evaluation results yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}