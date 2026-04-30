"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BackendEvaluationResult = {
  id: number;
  transcription: number;
  wer: number;
  dialect: string | null;
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
        if (!cancelled) setRows(list);
      } catch {
        // ignore
      }
    }
    void loadRows();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex h-14 items-center justify-between rounded-xl border border-[#E7E5E4] bg-white px-5">
        <div className="text-sm text-[#64748B]">
          Project <span className="mx-2">/</span>
          <span className="font-medium text-[#0F172A]">Evaluation History</span>
        </div>
        <Link
          href="/evaluation"
          className="rounded-lg border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F5F5F4]"
        >
          Back to evaluation
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-sm">
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
            Evaluation results history
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm text-[#334155]">
              <thead>
                <tr className="border-b border-[#E7E5E4] text-xs text-[#64748B]">
                  <th className="px-2 py-2 text-left">Result ID</th>
                  <th className="px-2 py-2 text-left">Transcription</th>
                  <th className="px-2 py-2 text-left">WER</th>
                  <th className="px-2 py-2 text-left">Dialect</th>
                  <th className="px-2 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((result) => (
                    <tr key={result.id} className="border-b border-[#F1F5F9]">
                      <td className="px-2 py-2">#{result.id}</td>
                      <td className="px-2 py-2">#{result.transcription}</td>
                      <td className="px-2 py-2">{(result.wer * 100).toFixed(2)}%</td>
                      <td className="px-2 py-2">{result.dialect || "N/A"}</td>
                      <td className="px-2 py-2">
                        {new Date(result.evaluation_date).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-2 py-3 text-[#64748B]" colSpan={5}>
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
