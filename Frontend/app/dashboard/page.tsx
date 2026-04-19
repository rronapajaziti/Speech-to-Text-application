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

async function getDashboardStats(): Promise<DashboardStats | null> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
  try {
    const response = await fetch(`${apiBase}/dashboard/stats/`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
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

  if (!data) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-red-600 dark:text-red-300">
          Could not load dashboard stats. Check backend API and `NEXT_PUBLIC_API_BASE_URL`.
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
  const processingAngle = Math.max(0, 360 - completedAngle - failedAngle - pendingAngle);
  const completedPercent = toPercent(completed, total);
  const failedPercent = toPercent(failed, total);
  const pendingPercent = toPercent(pending, total);
  const processingPercent = toPercent(processing, total);

  const donutBackground = `conic-gradient(
    #22c55e 0deg ${completedAngle}deg,
    #f43f5e ${completedAngle}deg ${completedAngle + failedAngle}deg,
    #f59e0b ${completedAngle + failedAngle}deg ${completedAngle + failedAngle + pendingAngle}deg,
    #0ea5e9 ${completedAngle + failedAngle + pendingAngle}deg ${completedAngle + failedAngle + pendingAngle + processingAngle}deg
  )`;

  const best = data.wer_metrics.best_wer;
  const avg = data.wer_metrics.average_wer;
  const worst = data.wer_metrics.worst_wer;
  const bestPct = Math.min(100, Math.max(0, Math.round(best * 100)));
  const avgPct = Math.min(100, Math.max(0, Math.round(avg * 100)));
  const worstPct = Math.min(100, Math.max(0, Math.round(worst * 100)));

  const metadataSignals = Number(data.variation_coverage.noise_metadata_available) + Number(data.variation_coverage.dialect_metadata_available);
  const topLanguages = data.variation_coverage.language_distribution.slice(0, 6);
  const topLanguageTotal = topLanguages.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 shadow">
          <p className="text-sm text-zinc-500 dark:text-zinc-300">Total Transcriptions</p>
          <p className="text-2xl font-semibold mt-1">{total}</p>
        </div>
        <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 shadow">
          <p className="text-sm text-zinc-500 dark:text-zinc-300">Avg Audio Duration</p>
          <p className="text-2xl font-semibold mt-1">{data.workflow_factors.average_audio_duration_seconds}s</p>
        </div>
        <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 shadow">
          <p className="text-sm text-zinc-500 dark:text-zinc-300">Reference Samples</p>
          <p className="text-2xl font-semibold mt-1">{data.wer_metrics.samples_with_reference_text}</p>
        </div>
        <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 shadow">
          <p className="text-sm text-zinc-500 dark:text-zinc-300">Metadata Signals</p>
          <p className="text-2xl font-semibold mt-1">{metadataSignals}/2</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 shadow">
          <h2 className="text-lg font-semibold">Workflow Donut</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">Status share across all runs</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-6 items-center">
            <div
              className="h-44 w-44 rounded-full relative ring-4 ring-zinc-100 dark:ring-zinc-800"
              style={{ background: donutBackground }}
            >
              <div className="absolute inset-5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold leading-none">{data.workflow_factors.success_rate_percent}%</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-300 mt-1">Success</p>
              </div>
            </div>
            <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {[
                { label: "Completed", count: completed, percent: completedPercent, color: "bg-emerald-500" },
                { label: "Failed", count: failed, percent: failedPercent, color: "bg-rose-500" },
                { label: "Pending", count: pending, percent: pendingPercent, color: "bg-amber-500" },
                { label: "Processing", count: processing, percent: processingPercent, color: "bg-sky-500" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 font-medium">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                      {item.label}
                    </p>
                    <p>{item.percent}%</p>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{item.count} samples</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 shadow">
          <h2 className="text-lg font-semibold">WER Range Band</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">Best, average, and worst word error rate</p>
          <div className="mt-5 space-y-4 text-sm">
            <div>
              <div className="flex justify-between mb-1">
                <span>Best WER</span>
                <span>{best}</span>
              </div>
              <div className="h-2 rounded bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded" style={{ width: `${bestPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Average WER</span>
                <span>{avg}</span>
              </div>
              <div className="h-2 rounded bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                <div className="h-full bg-amber-500 rounded" style={{ width: `${avgPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Worst WER</span>
                <span>{worst}</span>
              </div>
              <div className="h-2 rounded bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                <div className="h-full bg-rose-500 rounded" style={{ width: `${worstPct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <p>Low-WER share: {data.robustness_and_accuracy.low_wer_ratio_percent}%</p>
              <p>High-WER share: {data.robustness_and_accuracy.high_wer_ratio_percent}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 shadow">
          <h2 className="text-lg font-semibold">Model Coverage Ranking</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">Top ASR models by usage count</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            {data.variation_coverage.model_distribution.slice(0, 6).map((model) => {
              const percent = toPercent(model.total, total);
              return (
                <div key={model.model_name || "unknown"}>
                  <div className="flex justify-between">
                    <span>{model.model_name || "unknown"}</span>
                    <span>{model.total}</span>
                  </div>
                  <div className="h-2 mt-1 rounded bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                    <div className="h-full rounded bg-indigo-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
            {data.variation_coverage.model_distribution.length === 0 && <p>No model data yet.</p>}
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 shadow">
          <h2 className="text-lg font-semibold">Language Coverage Heat List</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">Top languages with count and share of language samples</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            {topLanguages.map((language, index) => {
              const shareInLanguages = toPercent(language.total, topLanguageTotal);
              return (
                <div key={`${language.audio__language__code}-${index}`}>
                  <div className="flex justify-between items-center">
                    <p className="font-medium">
                      {index + 1}. {language.audio__language__language_name}
                      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                        ({language.audio__language__code})
                      </span>
                    </p>
                    <p>{language.total} | {shareInLanguages}%</p>
                  </div>
                  <div className="h-2 mt-1 rounded bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                    <div
                      className="h-full rounded bg-cyan-500"
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

      <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 shadow">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-300">Latest samples with quick quality and workflow tags</p>
        <div className="mt-4 flex flex-col gap-3 text-sm">
          {data.recent_activity.length === 0 ? (
            <p>No transcriptions yet.</p>
          ) : (
            data.recent_activity.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    #{item.id} {item.model_name} | {item.language}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800">
                      {item.status}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        item.wer_score === null
                          ? "bg-zinc-100 dark:bg-zinc-800"
                          : item.wer_score <= 0.2
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : item.wer_score >= 0.4
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}
                    >
                      {item.wer_score === null ? "WER N/A" : `WER ${item.wer_score}`}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">
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
