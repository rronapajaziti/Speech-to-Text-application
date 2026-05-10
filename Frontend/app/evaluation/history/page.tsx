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
  evaluation_date?: string | null;
  created_at?: string | null;
  model_name?: string | null;
  username?: string | null;
};

export default function EvaluationHistoryPage() {
  const apiBase = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");

  const [rows, setRows] = useState<BackendEvaluationResult[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      try {
        const res = await fetch(`${apiBase}/evaluation-results/`);
        if (!res.ok || cancelled) return;

        const list = (await res.json()) as BackendEvaluationResult[];

        const sorted = [...list].sort((a, b) => {
          const aDate = new Date(
            a.evaluation_date || a.created_at || 0,
          ).getTime();
          const bDate = new Date(
            b.evaluation_date || b.created_at || 0,
          ).getTime();
          return bDate - aDate;
        });

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
  async function deleteResult(id: number) {
    const confirmDelete = confirm(
      "Are you sure you want to delete this result?",
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${apiBase}/evaluation-results/delete/${id}/`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete result");
    }
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex h-14 items-center justify-between rounded-xl border border-[#E7E5E4] bg-white px-5">
        <div className="text-sm text-[#64748B]">
          Project <span className="mx-2">/</span>
          <span className="font-medium text-[#0F172A]">Evaluation History</span>
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
                  <th className="px-2 py-2 text-left">Model</th>
                  <th className="px-2 py-2 text-left">Username</th>
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
                      <td className="px-3 py-3">{r.model_name ?? "N/A"}</td>
                      <td className="px-3 py-3">{r.username ?? "N/A"}</td>
                      <td className="px-3 py-3">{r.age ?? "N/A"}</td>
                      <td className="px-3 py-3">{r.gender ?? "N/A"}</td>
                      <td className="px-3 py-3">{r.dialect || "N/A"}</td>
                      <td className="px-3 py-3">{(r.wer * 100).toFixed(2)}%</td>
                      <td className="px-3 py-3">
                        {new Date(
                          r.evaluation_date || r.created_at || 0,
                        ).toLocaleString()}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/evaluation/${r.id}`}
                            className="inline-flex items-center justify-center rounded-md border border-[#E7E5E4] px-2.5 py-1.5 text-xs font-medium text-[#334155] transition hover:bg-[#F5F5F4]"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => deleteResult(r.id)}
                            className="inline-flex items-center justify-center rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
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
