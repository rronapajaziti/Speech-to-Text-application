"use client";

import { AgCharts } from "ag-charts-react";
import { AllCommunityModule, ModuleRegistry } from "ag-charts-community";
import type { AgChartOptions } from "ag-charts-community";

ModuleRegistry.registerModules([AllCommunityModule]);

// ── Academic colour palette (ColorBrewer RdBu, print-safe) ───────────────
const C = {
  excellent: "#2166AC",
  good:      "#74ADD1",
  fair:      "#F4A582",
  poor:      "#B2182B",
  correct:   "#2166AC",
  subst:     "#B2182B",
  del:       "#92400E",
  ins:       "#4D4D4D",
  wer:       "#B2182B",
  acc:       "#1D3557",
  cer:       "#636E72",
  mono:      "#2166AC",
} as const;

const BG         = { fill: "#ffffff" } as const;
const AXIS_LINE  = { stroke: "#CBD5E1", width: 1 };
const GRID_STYLE = [{ stroke: "#E9EEF3", lineDash: [3, 3] }];

// ── WER Distribution Donut ────────────────────────────────────────────────
export function WERDistributionDonut({
  excellent, good, fair, poor,
}: {
  excellent: number; good: number; fair: number; poor: number;
}) {
  const options: AgChartOptions = {
    data: [
      { band: "Excellent  (<10%)", count: excellent },
      { band: "Good  (10–20%)",    count: good },
      { band: "Fair  (20–40%)",    count: fair },
      { band: "Poor  (≥40%)",      count: poor },
    ].filter((d) => d.count > 0),
    series: [{
      type: "donut", calloutLabelKey: "band", angleKey: "count",
      innerRadiusRatio: 0.65,
      fills: [C.excellent, C.good, C.fair, C.poor], strokes: ["#ffffff"],
      calloutLabel: { enabled: false }, sectorLabel: { enabled: false },
    }],
    legend: { enabled: true, position: "right", spacing: 12, item: { label: { fontSize: 12 } } },
    background: BG, height: 250,
    padding: { top: 12, bottom: 4, left: 4, right: 4 },
  };
  return <AgCharts options={options} style={{ width: "100%" }} />;
}

// ── Error Breakdown Donut ────────────────────────────────────────────────
export function ErrorBreakdownDonut({
  hits, substitutions, deletions, insertions,
}: {
  hits: number; substitutions: number; deletions: number; insertions: number;
}) {
  const options: AgChartOptions = {
    data: [
      { type: "Correct",       count: hits },
      { type: "Substitutions", count: substitutions },
      { type: "Deletions",     count: deletions },
      { type: "Insertions",    count: insertions },
    ].filter((d) => d.count > 0),
    series: [{
      type: "donut", calloutLabelKey: "type", angleKey: "count",
      innerRadiusRatio: 0.65,
      fills: [C.correct, C.subst, C.del, C.ins], strokes: ["#ffffff"],
      calloutLabel: { enabled: false }, sectorLabel: { enabled: false },
    }],
    legend: { enabled: true, position: "right", spacing: 12, item: { label: { fontSize: 12 } } },
    background: BG, height: 250,
    padding: { top: 12, bottom: 4, left: 4, right: 4 },
  };
  return <AgCharts options={options} style={{ width: "100%" }} />;
}

// ── Comparison Grouped Bar (Gender / Age / Language / Dialect) ───────────
type GroupItem = {
  label: string;
  avg_wer: number;
  avg_accuracy: number;
  avg_cer: number;
};

export function ComparisonGroupedBar({ items }: { items: GroupItem[] }) {
  const options = {
    data: items.map((g) => ({
      group:    g.label,
      wer:      +(g.avg_wer      * 100).toFixed(2),
      accuracy: +(g.avg_accuracy * 100).toFixed(2),
      cer:      +(g.avg_cer      * 100).toFixed(2),
    })),
    series: [
      { type: "bar", xKey: "group", yKey: "wer",      yName: "WER (%)",      fill: C.wer, stroke: C.wer },
      { type: "bar", xKey: "group", yKey: "accuracy",  yName: "Accuracy (%)", fill: C.acc, stroke: C.acc },
      { type: "bar", xKey: "group", yKey: "cer",       yName: "CER (%)",      fill: C.cer, stroke: C.cer },
    ],
    axes: [
      { type: "category", position: "bottom", line: AXIS_LINE, label: { fontSize: 12 } },
      {
        type: "number", position: "left",
        title: { text: "Percentage (%)", fontSize: 12 },
        min: 0, max: 100, line: AXIS_LINE,
        gridLine: { style: GRID_STYLE },
        label: { fontSize: 11, formatter: ({ value }: { value: number }) => `${value}%` },
      },
    ],
    legend: { enabled: true, position: "bottom", spacing: 16, item: { label: { fontSize: 12 } } },
    background: BG, height: 270,
    padding: { top: 16, bottom: 8, left: 8, right: 8 },
  } as unknown as AgChartOptions;
  return <AgCharts options={options} style={{ width: "100%" }} />;
}
