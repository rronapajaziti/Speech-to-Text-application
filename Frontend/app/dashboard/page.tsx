type DashboardStats = {
  workflow_factors: {
    total_transcriptions: number;
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
  variation_coverage: {
    unique_models_tested: number;
    unique_languages_tested: number;
    model_distribution: Array<{ model_name: string; total: number }>;
    model_performance: Array<{
      model_name: string;
      total: number;
      avg_wer: number | null;
      best_wer: number | null;
      worst_wer: number | null;
      avg_accuracy: number | null;
    }>;
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

  console.log("[dashboard] fetching from:", apiBase); // check Netlify function logs

  try {
    const response = await fetch(`${apiBase}/dashboard/stats/`, {
      cache: "no-store",
    });
    console.log("[dashboard] response status:", response.status);
    if (!response.ok) return null;
    return response.json();
  } catch (e) {
    console.error("[dashboard] fetch error:", e); // this will show the real error
    return null;
  }
}

function toPercent(part: number, total: number): number {
  if (!total) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

function toAngle(part: number, total: number): number {
  if (!total) {
    return 0;
  }
  return Math.round((part / total) * 360);
}

export default async function DashboardPage() {
  const data = await getDashboardStats();
  const cardClass = "rounded-xl border border-[#D7E3FF] bg-[#EEF2FF] shadow-sm";
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

  const total = data.workflow_factors.total_transcriptions;
  const completed = data.workflow_factors.completed_transcriptions;
  const failed = data.workflow_factors.failed_transcriptions;
  const pending = data.workflow_factors.pending_transcriptions;
  const processing = data.workflow_factors.processing_transcriptions;

  const completedAngle = toAngle(completed, total);
  const failedAngle = toAngle(failed, total);
  const pendingAngle = toAngle(pending, total);
  const processingAngle = Math.max(
    0,
    360 - completedAngle - failedAngle - pendingAngle,
  );
  const completedPercent = toPercent(completed, total);
  const failedPercent = toPercent(failed, total);
  const pendingPercent = toPercent(pending, total);
  const processingPercent = toPercent(processing, total);

  const donutBackground = `conic-gradient(
    #06a77d 0deg ${completedAngle}deg,
    #c1121f ${completedAngle}deg ${completedAngle + failedAngle}deg,
    #ffc300 ${completedAngle + failedAngle}deg ${completedAngle + failedAngle + pendingAngle}deg,
    #0ea5e9 ${completedAngle + failedAngle + pendingAngle}deg ${completedAngle + failedAngle + pendingAngle + processingAngle}deg
  )`;

  const best = data.wer_metrics.best_wer;
  const avg = data.wer_metrics.average_wer;
  const worst = data.wer_metrics.worst_wer;
  const bestPct = Math.min(100, Math.max(0, Math.round(best * 100)));
  const avgPct = Math.min(100, Math.max(0, Math.round(avg * 100)));
  const worstPct = Math.min(100, Math.max(0, Math.round(worst * 100)));

  const metadataSignals =
    Number(data.variation_coverage.noise_metadata_available) +
    Number(data.variation_coverage.dialect_metadata_available);
  const topLanguages = data.variation_coverage.language_distribution.slice(
    0,
    6,
  );
  const topLanguageTotal = topLanguages.reduce(
    (acc, item) => acc + item.total,
    0,
  );

  return (
    <div className={`flex flex-col gap-6 ${primaryTextClass}`}>
      <h1 className="text-3xl font-bold text-[#0F172A]">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className={`p-5 ${cardClass}`}>
          <p className={`text-sm ${mutedTextClass}`}>Total Transcriptions</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className={`p-6 ${cardClass}`}>
          <h2 className="text-lg font-semibold">Workflow Donut</h2>
          <p className={`text-sm ${mutedTextClass}`}>
            Status share across all runs
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-5 items-center">
            {/* SLIM DONUT */}
            <div className="relative h-40 w-40 shrink-0">
              {/* outer ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: donutBackground }}
              />

              {/* inner hole (slimmer than before) */}
              <div className="absolute inset-[22%] rounded-full bg-white border border-[#D7E3FF] flex flex-col items-center justify-center">
                <p className="text-lg font-bold leading-none">
                  {data.workflow_factors.success_rate_percent}%
                </p>
                <p className={`text-[11px] mt-1 ${mutedTextClass}`}>Success</p>
              </div>
            </div>

            {/* SLIMMER CARDS ROW */}
            <div className="text-sm flex flex-wrap gap-2 w-full">
              {[
                {
                  label: "Completed",
                  count: completed,
                  percent: completedPercent,
                  color: "bg-[#06a77d]",
                },
                {
                  label: "Failed",
                  count: failed,
                  percent: failedPercent,
                  color: "bg-[#c1121f]",
                },
                {
                  label: "Pending",
                  count: pending,
                  percent: pendingPercent,
                  color: "bg-[#FFC300]",
                },
                {
                  label: "Processing",
                  count: processing,
                  percent: processingPercent,
                  color: "bg-[#0EA5E9]",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex-1 min-w-[140px] rounded-md border border-[#D7E3FF] bg-white px-2 py-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1 font-medium text-sm">
                      <span className={`h-2 w-2 rounded-full ${item.color}`} />
                      {item.label}
                    </p>
                    <p className="text-sm">{item.percent}%</p>
                  </div>

                  <p className={`text-[11px] mt-1 ${mutedTextClass}`}>
                    {item.count} samples
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`p-6 ${cardClass}`}>
          <h2 className="text-lg font-semibold">WER Range Band</h2>
          <p className={`text-sm ${mutedTextClass}`}>
            Best, average, and worst word error rate
          </p>
          <div className="mt-5 space-y-4 text-sm">
            <div>
              <div className="flex justify-between mb-1">
                <span>Best WER</span>
                <span>{best}</span>
              </div>
              <div className="h-2 rounded bg-[#D7E3FF] overflow-hidden">
                <div
                  className="h-full bg-[#06a77d] rounded"
                  style={{ width: `${bestPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Average WER</span>
                <span>{avg}</span>
              </div>
              <div className="h-2 rounded bg-[#D7E3FF] overflow-hidden">
                <div
                  className="h-full bg-[#FFC300] rounded"
                  style={{ width: `${avgPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Worst WER</span>
                <span>{worst}</span>
              </div>
              <div className="h-2 rounded bg-[#D7E3FF] overflow-hidden">
                <div
                  className="h-full bg-[#c1121f] rounded"
                  style={{ width: `${worstPct}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <p>
                Low-WER share:{" "}
                {data.robustness_and_accuracy.low_wer_ratio_percent}%
              </p>
              <p>
                High-WER share:{" "}
                {data.robustness_and_accuracy.high_wer_ratio_percent}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className={`p-6 ${cardClass}`}>
          <h2 className="text-lg font-semibold">Model Performance</h2>
          <p className={`text-sm ${mutedTextClass}`}>
            Compare quality and usage for each model
          </p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            {data.variation_coverage.model_performance
              .slice(0, 8)
              .map((model) => {
                const percent = toPercent(model.total, total || 1);
                return (
                  <div key={model.model_name || "unknown"}>
                    <div className="flex justify-between gap-3">
                      <span className="font-medium">
                        {model.model_name || "unknown"}
                      </span>
                      <span>{model.total} runs</span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-4 text-xs text-[#475569]">
                      <span>
                        Avg WER:{" "}
                        {model.avg_wer === null
                          ? "N/A"
                          : model.avg_wer.toFixed(4)}
                      </span>
                      <span>
                        Avg Accuracy:{" "}
                        {model.avg_accuracy === null
                          ? "N/A"
                          : `${(model.avg_accuracy * 100).toFixed(2)}%`}
                      </span>
                    </div>
                    <div className="h-2 mt-1 rounded bg-[#D7E3FF] overflow-hidden">
                      <div
                        className="h-full rounded bg-[#1E3A8A]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            {data.variation_coverage.model_performance.length === 0 && (
              <p>No model data yet.</p>
            )}
          </div>
        </div>

        <div className={`p-6 ${cardClass}`}>
          <h2 className="text-lg font-semibold">Language Coverage Heat List</h2>
          <p className={`text-sm ${mutedTextClass}`}>
            Top languages with count and share of language samples
          </p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            {topLanguages.map((language, index) => {
              const shareInLanguages = toPercent(
                language.total,
                topLanguageTotal,
              );
              return (
                <div key={`${language.audio__language__code}-${index}`}>
                  <div className="flex justify-between items-center">
                    <p className="font-medium">
                      {index + 1}. {language.audio__language__language_name}
                      <span className={`ml-2 text-xs ${mutedTextClass}`}>
                        ({language.audio__language__code})
                      </span>
                    </p>
                    <p>
                      {language.total} | {shareInLanguages}%
                    </p>
                  </div>
                  <div className="h-2 mt-1 rounded bg-[#D7E3FF] overflow-hidden">
                    <div
                      className="h-full rounded bg-[#0EA5E9]"
                      style={{ width: `${Math.max(8, shareInLanguages)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {topLanguages.length === 0 && (
              <p className="text-sm mt-2">No language data yet.</p>
            )}
          </div>
        </div>
      </div>

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
                className="rounded-lg border border-[#D7E3FF] bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    #{item.id} {item.model_name} | {item.language}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[#E0E7FF] text-[#1E3A8A]">
                      {item.status}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        item.wer_score === null
                          ? "bg-[#E0E7FF] text-[#1E3A8A]"
                          : item.wer_score <= 0.2
                            ? "bg-[#D5F3EE] text-[#06a77d]"
                            : item.wer_score >= 0.4
                              ? "bg-[#FBE4E4] text-[#c1121f]"
                              : "bg-[#FFF7D1] text-[#8C6A00]"
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
