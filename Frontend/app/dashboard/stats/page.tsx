import {
  WERDistributionDonut,
  ErrorBreakdownDonut,
  ComparisonGroupedBar,
} from "./StatsCharts";

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

const DIALECT_LABEL: Record<string, string> = {
  sq_kosovo_standard:    "Kosovo Standard Albanian",
  sq_prishtina:          "Prishtina Accent",
  sq_south_kosovo:       "Ferizaj Accent",
  en_kosovo_beginner:    "Kosovo English (A1–A2)",
  en_kosovo_intermediate:"Kosovo English (B1–B2)",
  en_kosovo_fluent:      "Kosovo English (C1–C2)",
  en_kosovo_code_switch: "Code-switching EN–SQ",
  de_standard:           "Standard German",
  de_germany_native:     "Native German (DE)",
  de_swiss_native:       "Swiss German (Native)",
  de_swiss_zurich:       "Swiss German (Zürich)",
  de_austrian:           "Austrian German",
  tr_standard:           "Standard Turkish",
  tr_native_istanbul:    "Istanbul Turkish",
  tr_native_ankara:      "Ankara Turkish",
  tr_anatolian:          "Anatolian Turkish",
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
  if (wer < 0.2) return "#1D3557"; // navy  — excellent
  if (wer < 0.4) return "#92400E"; // amber — acceptable
  return "#B2182B"; // crimson — poor
}

// Compact metric row shown beneath each grouped-bar chart
function MetricRow({ item, label }: { label: string; item: ComparisonItem }) {
  const color = werColor(item.avg_wer);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-[#DEE2E6] bg-[#F8F9FA] px-3 py-2 text-xs">
      <span className="font-medium capitalize min-w-[80px]">{label}</span>
      <span className="text-[#64748B]">{item.count} samples</span>
      <span>
        WER <b style={{ color }}>{(item.avg_wer * 100).toFixed(1)}%</b>
      </span>
      <span>
        Acc{" "}
        <b className="text-[#1D3557]">
          {(item.avg_accuracy * 100).toFixed(1)}%
        </b>
      </span>
      <span>
        CER <b>{(item.avg_cer * 100).toFixed(1)}%</b>
      </span>
    </div>
  );
}

export default async function StatsPage() {
  const data = await getStatsData();
  const card = "rounded-xl border border-[#DEE2E6] bg-white shadow-sm";
  const muted = "text-[#6B7280]";

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
    ? "#1D3557"
    : bench.within_benchmark
      ? "#92400E"
      : "#B2182B";
  const benchLabel = bench.beats_benchmark
    ? "Below literature baseline — strong performance"
    : bench.within_benchmark
      ? "Within literature range (20%–50% WER)"
      : "Above literature range — needs improvement";

  const distTotal = dist.total_scored || 1;
  const totalWords =
    ra.total_hits +
      ra.total_substitutions +
      ra.total_deletions +
      ra.total_insertions || 1;

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
          <p
            className="text-2xl font-semibold mt-1"
            style={{ color: benchColor }}
          >
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
          <div className="relative h-6 rounded-full bg-[#E5E9F0]">
            <div
              className="absolute top-0 h-full bg-[#9BC4E2] border-x border-[#2166AC]"
              style={{ left: "20%", width: "30%" }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full border-2 border-white shadow"
              style={{ left: `${sysWerPct}%`, backgroundColor: benchColor }}
            />
          </div>
          <div className="relative mt-1 text-xs text-[#64748B] h-4">
            <span className="absolute left-0">0%</span>
            <span className="absolute" style={{ left: "20%" }}>
              20%
            </span>
            <span className="absolute" style={{ left: "50%" }}>
              50%
            </span>
            <span className="absolute right-0">100%</span>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-[#DEE2E6] bg-[#F8F9FA] p-3">
              <p className={`text-xs ${muted}`}>System Avg WER</p>
              <p
                className="text-xl font-semibold mt-0.5"
                style={{ color: benchColor }}
              >
                {(bench.system_average_wer * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-[#DEE2E6] bg-[#F8F9FA] p-3">
              <p className={`text-xs ${muted}`}>System Avg Accuracy</p>
              <p className="text-xl font-semibold mt-0.5 text-[#1D3557]">
                {(bench.system_average_accuracy * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-[#DEE2E6] bg-[#F8F9FA] p-3">
              <p className={`text-xs ${muted}`}>Status vs. Literature</p>
              <p
                className="text-sm font-medium mt-0.5"
                style={{ color: benchColor }}
              >
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
          <WERDistributionDonut
            excellent={dist.excellent_count}
            good={dist.good_count}
            fair={dist.fair_count}
            poor={dist.poor_count}
          />
          {/* Exact counts table */}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {[
              {
                label: "Excellent (<10%)",
                count: dist.excellent_count,
                color: "#2166AC",
              },
              {
                label: "Good (10–20%)",
                count: dist.good_count,
                color: "#74ADD1",
              },
              {
                label: "Fair (20–40%)",
                count: dist.fair_count,
                color: "#92400E",
              },
              {
                label: "Poor (≥40%)",
                count: dist.poor_count,
                color: "#B2182B",
              },
            ].map((b) => (
              <div
                key={b.label}
                className="flex justify-between rounded border border-[#DEE2E6] bg-[#F8F9FA] px-2 py-1"
              >
                <span style={{ color: b.color }}>{b.label}</span>
                <span className="font-medium">
                  {b.count} ({toPct(b.count, distTotal)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-6 ${card}`}>
          <h2 className="text-lg font-semibold">Overall Error Breakdown</h2>
          <p className={`text-sm ${muted}`}>
            Total word-level errors across all evaluations
          </p>
          <ErrorBreakdownDonut
            hits={ra.total_hits}
            substitutions={ra.total_substitutions}
            deletions={ra.total_deletions}
            insertions={ra.total_insertions}
          />
          {/* Exact counts */}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {[
              { label: "Correct", val: ra.total_hits, color: "#2166AC" },
              {
                label: "Substitutions",
                val: ra.total_substitutions,
                color: "#B2182B",
              },
              { label: "Deletions", val: ra.total_deletions, color: "#92400E" },
              {
                label: "Insertions",
                val: ra.total_insertions,
                color: "#4D4D4D",
              },
            ].map((e) => (
              <div
                key={e.label}
                className="flex justify-between rounded border border-[#DEE2E6] bg-[#F8F9FA] px-2 py-1"
              >
                <span style={{ color: e.color }}>{e.label}</span>
                <span className="font-medium">
                  {e.val.toLocaleString()} ({toPct(e.val, totalWords)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Gender Comparison ── */}
      <div className={`p-6 ${card}`}>
        <h2 className="text-lg font-semibold">Gender Comparison</h2>
        <p className={`text-sm ${muted}`}>
          WER, accuracy, and CER by speaker gender
        </p>
        {data.gender_analysis.length === 0 ? (
          <p className={`mt-4 text-sm ${muted}`}>
            No gender data recorded yet.
          </p>
        ) : (
          <>
            <div className="mt-4">
              <ComparisonGroupedBar
items={data.gender_analysis.map((g) => ({
                  label: g.gender,
                  avg_wer: g.avg_wer,
                  avg_accuracy: g.avg_accuracy,
                  avg_cer: g.avg_cer,
                }))}
              />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {data.gender_analysis.map((g) => (
                <MetricRow key={g.gender} label={g.gender} item={g} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Age Group Comparison ── */}
      <div className={`p-6 ${card}`}>
        <h2 className="text-lg font-semibold">Age Group Comparison</h2>
        <p className={`text-sm ${muted}`}>
          WER, accuracy, and CER by speaker age group
        </p>
        {data.age_analysis.length === 0 ? (
          <p className={`mt-4 text-sm ${muted}`}>No age data recorded yet.</p>
        ) : (
          <>
            <div className="mt-4">
              <ComparisonGroupedBar
items={data.age_analysis.map((a) => ({
                  label: a.age_group,
                  avg_wer: a.avg_wer,
                  avg_accuracy: a.avg_accuracy,
                  avg_cer: a.avg_cer,
                }))}
              />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {data.age_analysis.map((a) => (
                <MetricRow key={a.age_group} label={a.age_group} item={a} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Language Comparison ── */}
      <div className={`p-6 ${card}`}>
        <h2 className="text-lg font-semibold">Language Comparison</h2>
        <p className={`text-sm ${muted}`}>
          WER, accuracy, and CER per language
        </p>
        {data.language_wer_analysis.length === 0 ? (
          <p className={`mt-4 text-sm ${muted}`}>No language data yet.</p>
        ) : (
          <>
            <div className="mt-4">
              <ComparisonGroupedBar
items={data.language_wer_analysis.map((l) => ({
                  label: l.language_name,
                  avg_wer: l.avg_wer,
                  avg_accuracy: l.avg_accuracy,
                  avg_cer: l.avg_cer,
                }))}
              />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {data.language_wer_analysis.map((l) => (
                <MetricRow
                  key={l.language_code}
                  label={`${l.language_name} (${l.language_code})`}
                  item={l}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Dialect Comparison ── */}
      <div className={`p-6 ${card}`}>
        <h2 className="text-lg font-semibold">Dialect Comparison</h2>
        <p className={`text-sm ${muted}`}>
          WER, accuracy, and CER per dialect
        </p>
        {data.dialect_analysis.length === 0 ? (
          <p className={`mt-4 text-sm ${muted}`}>No dialect data recorded yet.</p>
        ) : (
          <>
            <div className="mt-4">
              <ComparisonGroupedBar
                items={data.dialect_analysis.map((d) => ({
                  label: DIALECT_LABEL[d.dialect] ?? d.dialect,
                  avg_wer: d.avg_wer,
                  avg_accuracy: d.avg_accuracy,
                  avg_cer: d.avg_cer,
                }))}
              />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {data.dialect_analysis.map((d) => (
                <MetricRow
                  key={d.dialect}
                  label={DIALECT_LABEL[d.dialect] ?? d.dialect}
                  item={d}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Most Problematic Words ── */}
      <div className={`p-6 ${card}`}>
        <h2 className="text-lg font-semibold">Most Problematic Words</h2>
        <p className={`text-sm ${muted}`}>
          Reference words most frequently substituted or deleted by the ASR
          system (top 20)
        </p>
        {data.problematic_words.length === 0 ? (
          <p className={`mt-4 text-sm ${muted}`}>No error data available yet.</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.problematic_words.slice(0, 30).map((w) => {
                const max = data.problematic_words[0].error_count;
                const pct = Math.round((w.error_count / max) * 100);
                const [bg, fg, border] =
                  pct > 66
                    ? ["#FEE2E2", "#B2182B", "#FECACA"]
                    : pct > 33
                      ? ["#DBEAFE", "#2166AC", "#BFDBFE"]
                      : ["#E0EEF8", "#4393C3", "#BAD6ED"];
                return (
                  <span
                    key={w.word}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium"
                    style={{ backgroundColor: bg, color: fg, borderColor: border }}
                  >
                    {w.word}
                    <span className="text-xs opacity-70">×{w.error_count}</span>
                  </span>
                );
              })}
            </div>
            <div className={`mt-3 flex flex-wrap gap-4 text-xs ${muted}`}>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#B2182B]" /> High frequency
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2166AC]" /> Medium frequency
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#4393C3]" /> Low frequency
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
