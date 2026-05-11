type ComparisonItem = {
  count: number;
  avg_wer: number;
  avg_accuracy: number;
  avg_cer: number;
  total_hits: number;
  total_substitutions: number;
  total_deletions: number;
  total_insertions: number;
};

type StatsData = {
  workflow_factors: {
    total_evaluations: number;
    average_audio_duration_seconds: number;
  };
  robustness_and_accuracy: {
    average_accuracy_score: number;
    average_error_rate: number;
    low_wer_ratio_percent: number;
    high_wer_ratio_percent: number;
    total_hits: number;
    total_substitutions: number;
    total_deletions: number;
    total_insertions: number;
  };
  wer_metrics: {
    average_wer: number;
    best_wer: number;
    worst_wer: number;
    samples_with_reference_text: number;
  };
  wer_benchmark: {
    literature_low_wer: number;
    literature_high_wer: number;
    system_average_wer: number;
    system_average_accuracy: number;
    beats_benchmark: boolean;
    within_benchmark: boolean;
    above_benchmark: boolean;
  };
  wer_distribution: {
    excellent_count: number;
    good_count: number;
    fair_count: number;
    poor_count: number;
    total_scored: number;
  };
  gender_analysis: Array<ComparisonItem & { gender: string }>;
  dialect_analysis: Array<ComparisonItem & { dialect: string }>;
  language_wer_analysis: Array<
    ComparisonItem & { language_name: string; language_code: string }
  >;
  age_analysis: Array<ComparisonItem & { age_group: string }>;
  problematic_words: Array<{ word: string; error_count: number }>;
};

export const dynamic = "force-static";
export const revalidate = 300;

async function getStatsData(): Promise<StatsData | null> {
  const apiBase = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");
  try {
    const response = await fetch(`${apiBase}/dashboard/stats/`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return response.json();
  } catch (e) {
    console.error("[stats] fetch error:", e);
    return null;
  }
}

function toPct(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function werColor(wer: number) {
  if (wer < 0.2) return "#06a77d";
  if (wer < 0.4) return "#FFC300";
  return "#c1121f";
}

function ErrorBar({
  hits,
  substitutions,
  deletions,
  insertions,
}: {
  hits: number;
  substitutions: number;
  deletions: number;
  insertions: number;
}) {
  const total = hits + substitutions + deletions + insertions || 1;
  return (
    <div>
      <div className="h-2 flex rounded overflow-hidden bg-[#D7E3FF]">
        <div className="bg-[#06a77d]" style={{ width: `${(hits / total) * 100}%` }} />
        <div className="bg-[#FFC300]" style={{ width: `${(substitutions / total) * 100}%` }} />
        <div className="bg-[#F97316]" style={{ width: `${(deletions / total) * 100}%` }} />
        <div className="bg-[#c1121f]" style={{ width: `${(insertions / total) * 100}%` }} />
      </div>
      <div className="mt-1 grid grid-cols-4 text-[10px] gap-1">
        <span className="text-[#06a77d]">✓ {hits.toLocaleString()} correct</span>
        <span className="text-[#d97706]">~ {substitutions.toLocaleString()} wrong</span>
        <span className="text-[#F97316]">− {deletions.toLocaleString()} missing</span>
        <span className="text-[#c1121f]">+ {insertions.toLocaleString()} extra</span>
      </div>
    </div>
  );
}

function ComparisonCard({ label, item }: { label: string; item: ComparisonItem }) {
  return (
    <div className="rounded-lg border border-[#D7E3FF] bg-white p-3">
      <div className="flex justify-between items-center mb-2">
        <p className="font-medium capitalize">{label}</p>
        <span className="text-xs text-[#64748B]">{item.count} samples</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
        <span>
          WER:{" "}
          <b style={{ color: werColor(item.avg_wer) }}>
            {(item.avg_wer * 100).toFixed(1)}%
          </b>
        </span>
        <span>
          Accuracy:{" "}
          <b className="text-[#06a77d]">{(item.avg_accuracy * 100).toFixed(1)}%</b>
        </span>
        <span>
          CER: <b>{(item.avg_cer * 100).toFixed(1)}%</b>
        </span>
      </div>
      <ErrorBar
        hits={item.total_hits}
        substitutions={item.total_substitutions}
        deletions={item.total_deletions}
        insertions={item.total_insertions}
      />
    </div>
  );
}

export default async function StatsPage() {
  const data = await getStatsData();
  const card = "rounded-xl border border-[#D7E3FF] bg-[#EEF2FF] shadow-sm";
  const muted = "text-[#64748B]";

  if (!data) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold">Stats</h1>
        <p className="text-sm text-red-600">
          Could not load stats. Check backend API and NEXT_PUBLIC_API_BASE_URL.
        </p>
      </div>
    );
  }

  const ra = data.robustness_and_accuracy;
  const bench = data.wer_benchmark;
  const dist = data.wer_distribution;

  const sysWerPct = Math.min(100, Math.round(bench.system_average_wer * 100));
  const benchColor = bench.beats_benchmark
    ? "#06a77d"
    : bench.within_benchmark
      ? "#FFC300"
      : "#c1121f";
  const benchLabel = bench.beats_benchmark
    ? "Below literature baseline — strong performance"
    : bench.within_benchmark
      ? "Within literature range (20%–50% WER)"
      : "Above literature range — needs improvement";

  const distTotal = dist.total_scored || 1;
  const totalWords =
    ra.total_hits + ra.total_substitutions + ra.total_deletions + ra.total_insertions || 1;

  const maxWordError = data.problematic_words[0]?.error_count || 1;

  return (
    <div className="flex flex-col gap-6 text-[#0F172A]">
      <div>
        <h1 className="text-3xl font-bold">Stats</h1>
        <p className={`text-sm mt-1 ${muted}`}>
          Deep ASR analysis — benchmark comparison, error breakdown, and
          variation coverage by gender, age, language and dialect
        </p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className={`p-5 ${card}`}>
          <p className={`text-sm ${muted}`}>Total Evaluations</p>
          <p className="text-2xl font-semibold mt-1">
            {data.workflow_factors.total_evaluations}
          </p>
        </div>
        <div className={`p-5 ${card}`}>
          <p className={`text-sm ${muted}`}>Avg System Accuracy</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: benchColor }}>
            {(bench.system_average_accuracy * 100).toFixed(1)}%
          </p>
        </div>
        <div className={`p-5 ${card}`}>
          <p className={`text-sm ${muted}`}>Reference Samples</p>
          <p className="text-2xl font-semibold mt-1">
            {data.wer_metrics.samples_with_reference_text}
          </p>
        </div>
        <div className={`p-5 ${card}`}>
          <p className={`text-sm ${muted}`}>Avg Audio Duration</p>
          <p className="text-2xl font-semibold mt-1">
            {data.workflow_factors.average_audio_duration_seconds}s
          </p>
        </div>
      </div>

      {/* ── Benchmark Comparison ── */}
      <div className={`p-6 ${card}`}>
        <h2 className="text-lg font-semibold">Benchmark Comparison</h2>
        <p className={`text-sm ${muted}`}>
          System average WER vs. literature range 20%–50% (Kuhn et al. 2024;
          Amodei 2016)
        </p>
        <div className="mt-5">
          <div className="relative h-6 rounded-full bg-[#D7E3FF]">
            <div
              className="absolute top-0 h-full bg-[#FFF7D1] border-x border-[#FFC300]"
              style={{ left: "20%", width: "30%" }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full border-2 border-white shadow"
              style={{ left: `${sysWerPct}%`, backgroundColor: benchColor }}
            />
          </div>
          <div className="relative mt-1 text-xs text-[#64748B] h-4">
            <span className="absolute left-0">0%</span>
            <span className="absolute" style={{ left: "20%" }}>20%</span>
            <span className="absolute" style={{ left: "50%" }}>50%</span>
            <span className="absolute right-0">100%</span>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-[#D7E3FF] bg-white p-3">
              <p className={`text-xs ${muted}`}>System Avg WER</p>
              <p className="text-xl font-semibold mt-0.5" style={{ color: benchColor }}>
                {(bench.system_average_wer * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-[#D7E3FF] bg-white p-3">
              <p className={`text-xs ${muted}`}>System Avg Accuracy</p>
              <p className="text-xl font-semibold mt-0.5 text-[#06a77d]">
                {(bench.system_average_accuracy * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-[#D7E3FF] bg-white p-3">
              <p className={`text-xs ${muted}`}>Status vs. Literature</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: benchColor }}>
                {benchLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── WER Distribution + Overall Error Breakdown ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className={`p-6 ${card}`}>
          <h2 className="text-lg font-semibold">WER Distribution</h2>
          <p className={`text-sm ${muted}`}>
            Quality breakdown across {dist.total_scored} scored evaluations
          </p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            {[
              { label: "Excellent (WER < 10%)", count: dist.excellent_count, color: "bg-[#06a77d]" },
              { label: "Good (10% ≤ WER < 20%)", count: dist.good_count, color: "bg-[#22c55e]" },
              { label: "Fair (20% ≤ WER < 40%)", count: dist.fair_count, color: "bg-[#FFC300]" },
              { label: "Poor (WER ≥ 40%)", count: dist.poor_count, color: "bg-[#c1121f]" },
            ].map((b) => (
              <div key={b.label}>
                <div className="flex justify-between mb-1">
                  <span>{b.label}</span>
                  <span>{b.count} ({toPct(b.count, distTotal)}%)</span>
                </div>
                <div className="h-2 rounded bg-[#D7E3FF] overflow-hidden">
                  <div
                    className={`h-full rounded ${b.color}`}
                    style={{ width: `${Math.max(4, toPct(b.count, distTotal))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-6 ${card}`}>
          <h2 className="text-lg font-semibold">Overall Error Breakdown</h2>
          <p className={`text-sm ${muted}`}>
            Total word-level errors across all evaluations
          </p>
          <div className="mt-4">
            <ErrorBar
              hits={ra.total_hits}
              substitutions={ra.total_substitutions}
              deletions={ra.total_deletions}
              insertions={ra.total_insertions}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Correct words", val: ra.total_hits, color: "#06a77d" },
              { label: "Wrong words", val: ra.total_substitutions, color: "#d97706" },
              { label: "Missing words", val: ra.total_deletions, color: "#F97316" },
              { label: "Extra words", val: ra.total_insertions, color: "#c1121f" },
            ].map((e) => (
              <div key={e.label} className="rounded-lg border border-[#D7E3FF] bg-white p-3">
                <p className={`text-xs ${muted}`}>{e.label}</p>
                <p className="text-lg font-semibold mt-0.5" style={{ color: e.color }}>
                  {e.val.toLocaleString()}
                </p>
                <p className={`text-[10px] ${muted}`}>
                  {toPct(e.val, totalWords)}% of total
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Gender + Age Comparison ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className={`p-6 ${card}`}>
          <h2 className="text-lg font-semibold">Gender Comparison</h2>
          <p className={`text-sm ${muted}`}>
            WER, accuracy, and error breakdown by speaker gender
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {data.gender_analysis.length === 0 ? (
              <p className={`text-sm ${muted}`}>No gender data recorded yet.</p>
            ) : (
              data.gender_analysis.map((g) => (
                <ComparisonCard key={g.gender} label={g.gender} item={g} />
              ))
            )}
          </div>
        </div>

        <div className={`p-6 ${card}`}>
          <h2 className="text-lg font-semibold">Age Group Comparison</h2>
          <p className={`text-sm ${muted}`}>
            WER, accuracy, and error breakdown by speaker age group
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {data.age_analysis.length === 0 ? (
              <p className={`text-sm ${muted}`}>No age data recorded yet.</p>
            ) : (
              data.age_analysis.map((a) => (
                <ComparisonCard key={a.age_group} label={a.age_group} item={a} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Language Comparison ── */}
      <div className={`p-6 ${card}`}>
        <h2 className="text-lg font-semibold">Language Comparison</h2>
        <p className={`text-sm ${muted}`}>
          WER, accuracy, and error breakdown per language
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.language_wer_analysis.length === 0 ? (
            <p className={`text-sm ${muted}`}>No language data yet.</p>
          ) : (
            data.language_wer_analysis.map((lang) => (
              <ComparisonCard
                key={lang.language_code}
                label={`${lang.language_name} (${lang.language_code})`}
                item={lang}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Dialect Comparison ── */}
      <div className={`p-6 ${card}`}>
        <h2 className="text-lg font-semibold">Dialect Comparison</h2>
        <p className={`text-sm ${muted}`}>
          WER, accuracy, and error breakdown per dialect
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.dialect_analysis.length === 0 ? (
            <p className={`text-sm ${muted}`}>No dialect data recorded yet.</p>
          ) : (
            data.dialect_analysis.map((d) => (
              <ComparisonCard key={d.dialect} label={d.dialect} item={d} />
            ))
          )}
        </div>
      </div>

      {/* ── Most Problematic Words ── */}
      <div className={`p-6 ${card}`}>
        <h2 className="text-lg font-semibold">Most Problematic Words</h2>
        <p className={`text-sm ${muted}`}>
          Reference words most frequently substituted or deleted by the ASR
          system
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.problematic_words.length === 0 ? (
            <p className={`text-sm ${muted}`}>No error data available yet.</p>
          ) : (
            data.problematic_words.map((w) => {
              const intensity = Math.round((w.error_count / maxWordError) * 100);
              const bg =
                intensity > 66 ? "#FBE4E4" : intensity > 33 ? "#FFF7D1" : "#EEF2FF";
              const fg =
                intensity > 66 ? "#c1121f" : intensity > 33 ? "#8C6A00" : "#1E3A8A";
              return (
                <div
                  key={w.word}
                  className="flex items-center gap-1 rounded-full px-3 py-1 text-sm border"
                  style={{ backgroundColor: bg, color: fg, borderColor: bg }}
                >
                  <span className="font-medium">{w.word}</span>
                  <span className="text-xs opacity-75">×{w.error_count}</span>
                </div>
              );
            })
          )}
        </div>
        <div className={`mt-3 flex flex-wrap gap-4 text-xs ${muted}`}>
          <span className="flex items-center gap-1">
            <span className="h-2 w-4 rounded bg-[#FBE4E4]" /> High frequency
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-4 rounded bg-[#FFF7D1]" /> Medium frequency
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-4 rounded bg-[#EEF2FF]" /> Low frequency
          </span>
        </div>
      </div>
    </div>
  );
}
