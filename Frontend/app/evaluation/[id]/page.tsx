"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import "./evaluation-details.css";

type EvaluationDetail = {
  id: number;
  transcription: number;
  wer: number;
  cer: number;
  mer: number;
  wil: number;
  wip: number;

  substitutions: number;
  deletions: number;
  insertions: number;
  alignment?: {
    word: string | null;
    type: "correct" | "wrong" | "missing" | "extra";
  }[];

  dialect: string | null;
  gender: string | null;
  age: number | null;
  evaluation_date: string;
};

function normalizeAlignmentType(
  value: string | null | undefined,
): "correct" | "wrong" | "missing" | "extra" {
  const type = (value || "").toLowerCase().trim();
  if (type === "correct" || type === "hit" || type === "equal") return "correct";
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

export default function EvaluationDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

  const [data, setData] = useState<EvaluationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      try {
        const res = await fetch(
          `${apiBase}/evaluation-results/read/${id}/`
        );

        if (!res.ok) throw new Error("Failed to load evaluation");

        const json = (await res.json()) as EvaluationDetail;
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, apiBase]);

  if (loading) {
    return (
      <div className="center">
        Loading evaluation...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="center">
        Evaluation not found.
      </div>
    );
  }

  const werPercent = (data.wer * 100).toFixed(2);

  const readableStats = {
    accuracy: (1 - data.wer) * 100,
    errorRate: data.wer * 100,
    correctWords:
      (data.substitutions ?? 0) +
      (data.deletions ?? 0) +
      (data.insertions ?? 0),
    totalMistakes:
      (data.substitutions ?? 0) +
      (data.deletions ?? 0) +
      (data.insertions ?? 0),
  };

  return (
    <div className="page">

      {/* HEADER */}
      <div className="header">
        <div>
          <div className="breadcrumb">
            Evaluation / Detail
          </div>
          <h1 className="title">
            Evaluation #{data.id}
          </h1>
        </div>

        <Link href="/evaluation/history" className="backBtn">
          ← Back
        </Link>
      </div>

      {/* TOP GRID */}
      <div className="topGrid">

        {/* METADATA */}
        <div className="card">
          <h3 className="cardTitle">Metadata</h3>

          <div className="row">
            <span>Transcription ID</span>
            <b>{data.transcription}</b>
          </div>

          <div className="row">
            <span>Age</span>
            <b>{data.age ?? "N/A"}</b>
          </div>

          <div className="row">
            <span>Gender</span>
            <b>{data.gender ?? "N/A"}</b>
          </div>

          <div className="row">
            <span>Dialect</span>
            <b>{data.dialect ?? "N/A"}</b>
          </div>

          <div className="row">
            <span>Date</span>
            <b>
              {new Date(data.evaluation_date).toLocaleString()}
            </b>
          </div>
        </div>

        {/* PERFORMANCE */}
        <div className="card">
          <h3 className="cardTitle">Performance</h3>

          <div className="centerBox">
            <div className="werValue">
              {werPercent}%
            </div>
            <div className="werLabel">
              Word Error Rate
            </div>
          </div>

          <div className="progress">
            <div
              className="progressFill"
              style={{
                width: `${Math.min(Number(werPercent), 100)}%`,
              }}
            />
          </div>

          <p className="note">
            {Number(werPercent) < 15
              ? "Good performance"
              : Number(werPercent) < 30
              ? "Medium performance"
              : "Needs improvement"}
          </p>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="summary-card">

        <h3 className="section-title">
          Evaluation Summary
        </h3>

        {/* KPI CARDS */}
        <div className="kpi-grid">

          <div className="kpi-card">
            <div className="kpi-label">Accuracy</div>
            <div className="kpi-value">
              {readableStats.accuracy.toFixed(1)}%
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Error Rate</div>
            <div className="kpi-value">
              {readableStats.errorRate.toFixed(1)}%
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Correct Words</div>
            <div className="kpi-value">
              {readableStats.correctWords}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Total Mistakes</div>
            <div className="kpi-value">
              {readableStats.totalMistakes}
            </div>
          </div>

        </div>

        {/* BREAKDOWN */}
        <div className="breakdown-grid">

          <div className="mini-card">
            Wrong Words: <b>{data.substitutions}</b>
          </div>

          <div className="mini-card">
            Missing Words: <b>{data.deletions}</b>
          </div>

          <div className="mini-card">
            Extra Words: <b>{data.insertions}</b>
          </div>

        </div>
      </div>

      <div className="summary-card">
        <h3 className="section-title">Transcription output</h3>
        <div className="mt-3 h-56 overflow-auto rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 text-base leading-8">
          <div className="flex flex-wrap gap-x-2 gap-y-2">
            {Array.isArray(data.alignment) && data.alignment.length > 0 ? (
              data.alignment.map((item, idx) => {
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
                  <span key={idx} className={`${colorClass} inline-block`}>
                    {item.word ?? "[missing]"}
                  </span>
                );
              })
            ) : (
              <span className="text-[#64748B]">No alignment data available.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}