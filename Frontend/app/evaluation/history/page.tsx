"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BackendEvaluationResult = {
  id: number;
  transcription: number;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      try {
        const token = localStorage.getItem("access");

        const res = await fetch(
          `${apiBase}/evaluation-results/?page=${currentPage}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) return;

        const data = await res.json();

        if (!cancelled) {
          setRows(data.results);
          setTotal(data.count);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadRows();

    return () => {
      cancelled = true;
    };
  }, [apiBase, currentPage]);

  async function deleteResult(id: number) {
    const confirmDelete = confirm(
      "Are you sure you want to delete this result?",
    );
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("access");

      const res = await fetch(`${apiBase}/evaluation-results/delete/${id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error();

      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Failed to delete result");
    }
  }

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
          Back
        </Link>
      </div>

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
                      className="border-b border-[#e2e8f0] hover:bg-[#f8fafc]"
                    >
                      <td className="px-3 py-3">#{r.transcription}</td>
                      <td className="px-3 py-3">{r.model_name ?? "N/A"}</td>
                      <td className="px-3 py-3">{r.username ?? "N/A"}</td>
                      <td className="px-3 py-3">{r.age ?? "N/A"}</td>
                      <td className="px-3 py-3">{r.gender ?? "N/A"}</td>
                      <td className="px-3 py-3">{r.dialect ?? "N/A"}</td>
                      <td className="px-3 py-3">
                        {r.wer !== null && r.wer !== undefined
                          ? (r.wer * 100).toFixed(2) + "%"
                          : "N/A"}
                      </td>
                      <td className="px-3 py-3">
                        {new Date(
                          r.evaluation_date || r.created_at || 0,
                        ).toLocaleString()}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/evaluation/${r.id}`}
                            className="rounded-md border px-2.5 py-1.5 text-xs"
                          >
                            View
                          </Link>

                          <button
                            onClick={() => deleteResult(r.id)}
                            className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs text-red-700"
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
                      colSpan={9}
                      className="px-3 py-6 text-center text-[#94a3b8]"
                    >
                      No evaluation results yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-5 py-3 border-t border-[#E7E5E4]">
              <p className="text-xs text-[#64748B]">
                Total evaluations:{" "}
                <span className="font-semibold text-[#0F172A]">{total}</span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="rounded-md border px-2 py-1 text-xs disabled:opacity-40"
                >
                  Prev
                </button>

                <span className="text-xs text-[#334155]">
                  Page {currentPage}
                </span>

                <button
                  disabled={rows.length < 10}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded-md border px-2 py-1 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
