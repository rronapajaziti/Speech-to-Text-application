import {
  WorkflowDonutChart,
  WERRangeBandChart,
  LanguageCoverageChart,
} from "./DashboardCharts";

type ModelLangRow = {
  model: string;
  language_name: string;
  language_code: string;
  count: number;
  avg_wer: number;
  avg_accuracy: number;
  avg_cer: number;
};

type DashboardStats = {
  workflow_factors: {
    total_evaluations: number;
    completed_transcriptions: number;
    failed_transcriptions: number;
    pending_transcriptions: number;
    processing_transcriptions: number;
    success_rate_percent: number;
    average_audio_duration_seconds: number;
  };
  robustness_and_accuracy: {
    average_accuracy_score: number;
    average_error_rate: number;
    low_wer_ratio_percent: number;
    high_wer_ratio_percent: number;
  };
  wer_metrics: {
    average_wer: number;
    best_wer: number;
    worst_wer: number;
    samples_with_reference_text: number;
  };
  model_language_wer: ModelLangRow[];
  variation_coverage: {
    unique_models_tested: number;
    unique_languages_tested: number;
    language_distribution: Array<{
      audio__language__language_name: string;
      audio__language__code: string;
      total: number;
    }>;
    noise_metadata_available: boolean;
    dialect_metadata_available: boolean;
  };
  recent_activity: Array<{
    id: number;
    status: string;
    model_name: string;
    language: string;
    date_created: string;
    wer_score: number | null;
  }>;
};

export const dynamic = "force-static";
export const revalidate = 300;

async function getDashboardStats(): Promise<DashboardStats | null> {
  const apiBase = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");

  console.log("[dashboard] fetching from:", apiBase);

  try {
    const response = await fetch(`${apiBase}/dashboard/stats/`, {
      cache: "no-store",
    });
    console.log("[dashboard] response status:", response.status);
    if (!response.ok) return null;
    return response.json();
  } catch (e) {
    console.error("[dashboard] fetch error:", e);
    return null;
  }
}

export default async function DashboardPage() {
  const data = await getDashboardStats();
  const cardClass = "rounded-xl border border-[#DEE2E6] bg-white shadow-sm";
  const mutedTextClass = "text-[#64748B]";
  const primaryTextClass = "text-[#0F172A]";

  if (!data) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-red-600">
          Could not load dashboard stats. Check backend API and
          `NEXT_PUBLIC_API_BASE_URL`.
        </p>
      </div>
    );
  }

  const total = data.workflow_factors.total_evaluations;
  const completed = data.workflow_factors.completed_transcriptions;
  const failed = data.workflow_factors.failed_transcriptions;
  const pending = data.workflow_factors.pending_transcriptions;
  const processing = data.workflow_factors.processing_transcriptions;

  const metadataSignals =
    Number(data.variation_coverage.noise_metadata_available) +
    Number(data.variation_coverage.dialect_metadata_available);
  const topLanguages = data.variation_coverage.language_distribution.slice(0, 6);

  return (
    <div className={`flex flex-col gap-6 ${primaryTextClass}`}>
      <h1 className="text-3xl font-bold text-[#0F172A]">Dashboard</h1>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className={`p-5 ${cardClass}`}>
          <p className={`text-sm ${mutedTextClass}`}>Total Evaluations</p>
          <p className="text-2xl font-semibold mt-1">{total}</p>
        </div>
        <div className={`p-5 ${cardClass}`}>
          <p className={`text-sm ${mutedTextClass}`}>Avg Audio Duration</p>
          <p className="text-2xl font-semibold mt-1">
            {data.workflow_factors.average_audio_duration_seconds}s
          </p>
        </div>
        <div className={`p-5 ${cardClass}`}>
          <p className={`text-sm ${mutedTextClass}`}>Reference Samples</p>
          <p className="text-2xl font-semibold mt-1">
            {data.wer_metrics.samples_with_reference_text}
          </p>
        </div>
        <div className={`p-5 ${cardClass}`}>
          <p className={`text-sm ${mutedTextClass}`}>Metadata Signals</p>
          <p className="text-2xl font-semibold mt-1">{metadataSignals}/2</p>
        </div>
      </div>

      {/* ── Workflow Donut + WER Range ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className={`p-6 ${cardClass}`}>
          <h2 className="text-lg font-semibold">Workflow Status</h2>
          <p className={`text-sm ${mutedTextClass}`}>
            Status share across all runs — success rate:{" "}
            <b className="text-[#1D3557]">
              {data.workflow_factors.success_rate_percent}%
            </b>
          </p>
          <div className="mt-4">
            <WorkflowDonutChart
              completed={completed}
              failed={failed}
              pending={pending}
              processing={processing}
            />
          </div>
          {/* Summary row */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {[
              { label: "Completed",  count: completed,  color: "#1D3557" },
              { label: "Failed",     count: failed,     color: "#B2182B" },
              { label: "Pending",    count: pending,    color: "#78350F" },
              { label: "Processing", count: processing, color: "#475569" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between rounded border border-[#DEE2E6] bg-[#F8F9FA] px-2 py-1"
              >
                <span style={{ color: item.color }}>{item.label}</span>
                <span className="font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-6 ${cardClass}`}>
          <h2 className="text-lg font-semibold">WER Range Band</h2>
          <p className={`text-sm ${mutedTextClass}`}>
            Best, average, and worst word error rate
          </p>
          <div className="mt-4">
            <WERRangeBandChart
              best={data.wer_metrics.best_wer}
              average={data.wer_metrics.average_wer}
              worst={data.wer_metrics.worst_wer}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-[#DEE2E6] bg-[#F8F9FA] px-2 py-1 flex justify-between">
              <span className={mutedTextClass}>Low-WER share</span>
              <b>{data.robustness_and_accuracy.low_wer_ratio_percent}%</b>
            </div>
            <div className="rounded border border-[#DEE2E6] bg-[#F8F9FA] px-2 py-1 flex justify-between">
              <span className={mutedTextClass}>High-WER share</span>
              <b>{data.robustness_and_accuracy.high_wer_ratio_percent}%</b>
            </div>
          </div>
        </div>
      </div>

      {/* ── Model × Language WER Table + Language Coverage ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className={`p-6 ${cardClass}`}>
          <h2 className="text-lg font-semibold">Model Comparison by Language</h2>
          <p className={`text-sm ${mutedTextClass}`}>
            Best (lowest WER) evaluation per model × language
          </p>
          <div className="mt-4">
            {(data.model_language_wer ?? []).length === 0 ? (
              <p className={`text-sm ${mutedTextClass}`}>No model data yet.</p>
            ) : (() => {
              const rows = data.model_language_wer ?? [];
              const models = [...new Set(rows.map((r) => r.model))].sort();
              const languages = [
                ...new Map(rows.map((r) => [r.language_name, r.language_code])).entries(),
              ].sort(([a], [b]) => a.localeCompare(b));
              const lookup = new Map(
                rows.map((r) => [`${r.language_name}||${r.model}`, r])
              );
              const werColor = (w: number) =>
                w < 0.2 ? "#1D3557" : w < 0.4 ? "#92400E" : "#B2182B";

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[#DEE2E6]">
                        <th className="py-2 pr-4 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                          Language
                        </th>
                        {models.map((m) => (
                          <th
                            key={m}
                            className="py-2 px-3 text-center text-xs font-semibold text-[#64748B] uppercase tracking-wide"
                          >
                            {m}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {languages.map(([lang, code]) => (
                        <tr
                          key={lang}
                          className="border-b border-[#F1F5F9] hover:bg-[#F8F9FA] transition-colors"
                        >
                          <td className="py-2.5 pr-4 font-medium text-[#0F172A]">
                            {lang}
                            <span className={`ml-1.5 text-xs ${mutedTextClass}`}>
                              ({code})
                            </span>
                          </td>
                          {models.map((m) => {
                            const cell = lookup.get(`${lang}||${m}`);
                            return (
                              <td key={m} className="py-2.5 px-3 text-center">
                                {cell ? (
                                  <span
                                    className="font-semibold"
                                    style={{ color: werColor(cell.avg_wer) }}
                                  >
                                    {(cell.avg_wer * 100).toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className={`text-xs ${mutedTextClass}`}>—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>

        <div className={`p-6 ${cardClass}`}>
          <h2 className="text-lg font-semibold">Language Coverage</h2>
          <p className={`text-sm ${mutedTextClass}`}>
            Sample count per language (
            {data.variation_coverage.unique_languages_tested} unique)
          </p>
          <div className="mt-4">
            {topLanguages.length === 0 ? (
              <p className={`text-sm ${mutedTextClass}`}>No language data yet.</p>
            ) : (
              <LanguageCoverageChart languages={topLanguages} />
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className={`p-6 ${cardClass}`}>
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <p className={`text-sm ${mutedTextClass}`}>
          Latest samples with quick quality and workflow tags
        </p>
        <div className="mt-4 flex flex-col gap-3 text-sm">
          {data.recent_activity.length === 0 ? (
            <p>No transcriptions yet.</p>
          ) : (
            data.recent_activity.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-[#DEE2E6] bg-[#F8F9FA] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    #{item.id} {item.model_name} | {item.language}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[#E9EEF3] text-[#1D3557] font-medium">
                      {item.status}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.wer_score === null
                          ? "bg-[#E9EEF3] text-[#475569]"
                          : item.wer_score <= 0.2
                            ? "bg-[#DBEAFE] text-[#1D3557]"
                            : item.wer_score >= 0.4
                              ? "bg-[#FEE2E2] text-[#B2182B]"
                              : "bg-[#FEF3C7] text-[#78350F]"
                      }`}
                    >
                      {item.wer_score === null
                        ? "WER N/A"
                        : `WER ${item.wer_score}`}
                    </span>
                  </div>
                </div>
                <p className={`mt-1 ${mutedTextClass}`}>
                  {new Date(item.date_created).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
