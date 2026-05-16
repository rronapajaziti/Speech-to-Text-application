"use client";

import { AgCharts } from "ag-charts-react";
import { AllCommunityModule, ModuleRegistry } from "ag-charts-community";
import type { AgChartOptions } from "ag-charts-community";

ModuleRegistry.registerModules([AllCommunityModule]);

// ── Academic colour palette ───────────────────────────────────────────────
const C = {
  navy:    "#1D3557",
  blue:    "#2166AC",
  sky:     "#74ADD1",
  crimson: "#B2182B",
  amber:   "#92400E",
  slate:   "#475569",
  gold:    "#78350F",
} as const;

const BG         = { fill: "#ffffff" } as const;
const AXIS_LINE  = { stroke: "#CBD5E1", width: 1 };
const GRID_STYLE = [{ stroke: "#E9EEF3", lineDash: [3, 3] }];

// ── Workflow Donut ────────────────────────────────────────────────────────
export function WorkflowDonutChart({
  completed, failed, pending, processing,
}: {
  completed: number; failed: number; pending: number; processing: number;
}) {
  const options: AgChartOptions = {
    data: [
      { status: "Completed",  count: completed },
      { status: "Failed",     count: failed },
      { status: "Pending",    count: pending },
      { status: "Processing", count: processing },
    ].filter((d) => d.count > 0),
    series: [{
      type: "donut", calloutLabelKey: "status", angleKey: "count",
      innerRadiusRatio: 0.65,
      fills: [C.navy, C.crimson, C.gold, C.slate], strokes: ["#ffffff"],
      calloutLabel: { enabled: false }, sectorLabel: { enabled: false },
    }],
    legend: { enabled: true, position: "right", spacing: 14, item: { label: { fontSize: 12 } } },
    background: BG, height: 230,
    padding: { top: 12, bottom: 12, left: 4, right: 4 },
  };
  return <AgCharts options={options} style={{ width: "100%" }} />;
}

// ── WER Range Band ────────────────────────────────────────────────────────
export function WERRangeBandChart({
  best, average, worst,
}: {
  best: number; average: number; worst: number;
}) {
  const b = +(best    * 100).toFixed(2);
  const a = +(average * 100).toFixed(2);
  const w = +(worst   * 100).toFixed(2);

  const options = {
    data: [{ range: "WER Range", best: b, avg: a, worst: w }],
    series: [
      { type: "bar", direction: "horizontal", xKey: "range", yKey: "best",  yName: `Best  (${b}%)`,  fill: C.navy,    stroke: C.navy,    cornerRadius: 2 },
      { type: "bar", direction: "horizontal", xKey: "range", yKey: "avg",   yName: `Avg  (${a}%)`,   fill: C.slate,   stroke: C.slate,   cornerRadius: 2 },
      { type: "bar", direction: "horizontal", xKey: "range", yKey: "worst", yName: `Worst  (${w}%)`, fill: C.crimson, stroke: C.crimson, cornerRadius: 2 },
    ],
    axes: [
      { type: "category", position: "left", line: AXIS_LINE, label: { fontSize: 12 } },
      {
        type: "number", position: "bottom",
        title: { text: "Word Error Rate (%)", fontSize: 12 },
        min: 0, max: 100, line: AXIS_LINE, gridLine: { style: GRID_STYLE },
        label: { fontSize: 11, formatter: ({ value }: { value: number }) => `${value}%` },
      },
    ],
    legend: { enabled: true, position: "bottom", spacing: 16, item: { label: { fontSize: 12 } } },
    background: BG, height: 190,
    padding: { top: 12, bottom: 8, left: 8, right: 24 },
  } as unknown as AgChartOptions;
  return <AgCharts options={options} style={{ width: "100%" }} />;
}

// ── Model Performance Grouped Bar ─────────────────────────────────────────
type ModelPerf = {
  model_name: string;
  total: number;
  avg_wer: number | null;
  avg_accuracy: number | null;
};

export function ModelPerformanceChart({ models }: { models: ModelPerf[] }) {
  const data = models.slice(0, 8).map((m) => ({
    model:    m.model_name || "unknown",
    wer:      m.avg_wer      !== null ? +(m.avg_wer      * 100).toFixed(2) : 0,
    accuracy: m.avg_accuracy !== null ? +(m.avg_accuracy * 100).toFixed(2) : 0,
  }));

  const options = {
    data,
    series: [
      { type: "bar", xKey: "model", yKey: "wer",      yName: "Avg WER (%)",      fill: C.crimson, stroke: C.crimson, cornerRadius: 2 },
      { type: "bar", xKey: "model", yKey: "accuracy",  yName: "Avg Accuracy (%)", fill: C.navy,    stroke: C.navy,    cornerRadius: 2 },
    ],
    axes: [
      { type: "category", position: "bottom", title: { text: "Model", fontSize: 12 }, label: { rotation: -30, fontSize: 11 }, line: AXIS_LINE },
      {
        type: "number", position: "left", title: { text: "(%)", fontSize: 12 },
        min: 0, max: 100, line: AXIS_LINE, gridLine: { style: GRID_STYLE },
        label: { fontSize: 11, formatter: ({ value }: { value: number }) => `${value}%` },
      },
    ],
    legend: { enabled: true, position: "bottom", spacing: 16, item: { label: { fontSize: 12 } } },
    background: BG, height: 290,
    padding: { top: 16, bottom: 8, left: 8, right: 8 },
  } as unknown as AgChartOptions;
  return <AgCharts options={options} style={{ width: "100%" }} />;
}

// ── Language Coverage Horizontal Bar ─────────────────────────────────────
type LangDist = {
  audio__language__language_name: string;
  audio__language__code: string;
  total: number;
};

export function LanguageCoverageChart({ languages }: { languages: LangDist[] }) {
  const data = languages.slice(0, 8).map((l) => ({
    lang:  `${l.audio__language__language_name} (${l.audio__language__code})`,
    count: l.total,
  }));

  const options = {
    data,
    series: [{
      type: "bar", direction: "horizontal", xKey: "lang", yKey: "count", yName: "Samples",
      fill: C.blue, stroke: C.blue, strokeWidth: 0, cornerRadius: 2,
    }],
    axes: [
      { type: "category", position: "left", line: AXIS_LINE, label: { fontSize: 11 } },
      {
        type: "number", position: "bottom",
        title: { text: "Sample Count", fontSize: 12 },
        min: 0, line: AXIS_LINE, gridLine: { style: GRID_STYLE }, label: { fontSize: 11 },
      },
    ],
    legend: { enabled: false },
    background: BG,
    height: Math.max(190, data.length * 36 + 70),
    padding: { top: 8, bottom: 24, left: 8, right: 24 },
  } as unknown as AgChartOptions;
  return <AgCharts options={options} style={{ width: "100%" }} />;
}
