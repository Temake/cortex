/**
 * Phase 2 preview — condition x hostel cluster view.
 *
 * FORM: the data is a count across two categorical dimensions, which is a
 * heatmap's exact job. A grouped bar chart of 5 conditions x 4 hostels would put
 * 20 near-empty bars on screen for counts of 0-6; the grid makes the spike
 * legible instantly. A second, single-series bar chart ranks totals by hostel.
 *
 * COLOUR: magnitude gets a SEQUENTIAL, single-hue ramp, light to dark — never a
 * rainbow, and never a gray one, which would collide with the neutral chrome.
 * The steps are the validated blue ramp; blue sits comfortably beside this
 * app's slate, which is itself a desaturated blue.
 *
 * Status colour (critical) is reserved for the spike callout and always ships
 * with an icon and a label, never as colour alone. A ramp legend, in-cell
 * values, and a toggleable data table mean identity is never colour-only.
 *
 * Built with CSS grid rather than recharts: it gives exact control over the 2px
 * surface gap between cells and the rounded data-ends, which is fiddly to force
 * through a charting library's defaults.
 */
"use client";

import { useMemo, useState } from "react";
import { Table2, TriangleAlert } from "lucide-react";

import type { ClustersResponse } from "@/lib/contracts";
import { Button, Card, Pill, cx } from "./ui";

/* Sequential ramp — one hue, light -> dark. Index = case count. */
const RAMP = [
  "#ffffff", // 0 — near-zero recedes into the surface
  "#cde2fb", // 1
  "#9ec5f4", // 2
  "#6da7ec", // 3
  "#3987e5", // 4
  "#256abf", // 5
  "#184f95", // 6+
];

/** White ink only once the fill is dark enough to carry it (step 500+). */
const INK_FLIP_AT = 5;

function rampFor(count: number): string {
  return RAMP[Math.min(count, RAMP.length - 1)];
}

export function ClusterChart({ data }: { data: ClustersResponse }) {
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState<{ condition: string; hostel: string; count: number } | null>(
    null,
  );

  const { conditions, hostels, matrix, spike } = data;

  const maxCount = useMemo(
    () =>
      Math.max(
        1,
        ...matrix.flatMap((row) => hostels.map((h) => Number(row[h] ?? 0))),
      ),
    [matrix, hostels],
  );

  const hostelTotals = useMemo(
    () =>
      hostels
        .map((hostel) => ({
          hostel,
          total: matrix.reduce((sum, row) => sum + Number(row[hostel] ?? 0), 0),
        }))
        .sort((a, b) => b.total - a.total),
    [hostels, matrix],
  );

  const maxHostelTotal = Math.max(1, ...hostelTotals.map((h) => h.total));

  return (
    <div className="space-y-6">
      {/* ── Spike callout — status colour + icon + label ───────────── */}
      <div className="alert alert-major">
        <div className="flex items-start gap-3">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <h3 className="font-display text-[1.0625rem] font-semibold">
              Possible cluster: {spike.condition} in {spike.hostel}
            </h3>
            <p className="mt-1 text-[0.9375rem] leading-relaxed">
              {spike.count} presentations from one hostel — {Math.round((spike.count / data.total) * 100)}% of
              all {data.total} recorded cases in this window. Worth a look from the Health Centre.
            </p>
          </div>
        </div>
      </div>

      {/* ── Heatmap ────────────────────────────────────────────────── */}
      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-[1.25rem]">Cases by condition and hostel</h3>
            <p className="mt-1 text-[0.875rem] text-ink-2">
              Darker means more presentations.
            </p>
          </div>

          {/* Sequential ramp legend */}
          <div className="flex items-center gap-2">
            <span className="text-[0.75rem] text-ink-3">0</span>
            <div className="flex overflow-hidden rounded-md" role="img" aria-label="Colour scale from 0 to maximum cases">
              {RAMP.slice(1).map((hex, i) => (
                <span
                  key={hex}
                  className="block size-4"
                  style={{ background: hex }}
                  title={`${i + 1} case${i === 0 ? "" : "s"}`}
                />
              ))}
            </div>
            <span className="text-[0.75rem] text-ink-3">{maxCount}+</span>
          </div>
        </div>

        {/* Wide content scrolls inside its own container. */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div
            className="grid min-w-[520px] gap-0.5"
            style={{ gridTemplateColumns: `minmax(9rem, 1.4fr) repeat(${hostels.length}, minmax(4.5rem, 1fr))` }}
          >
            {/* header row */}
            <div aria-hidden />
            {hostels.map((hostel) => (
              <div
                key={hostel}
                className="pb-2 text-center font-mono text-[0.6875rem] uppercase tracking-wider text-ink-3"
              >
                {hostel}
              </div>
            ))}

            {/* body */}
            {conditions.map((condition) => {
              const row = matrix.find((r) => r.condition === condition);
              return (
                <div key={condition} className="contents">
                  <div className="flex items-center pr-3 text-[0.875rem] leading-tight text-ink-2">
                    {condition}
                  </div>

                  {hostels.map((hostel) => {
                    const count = Number(row?.[hostel] ?? 0);
                    const isSpike = condition === spike.condition && hostel === spike.hostel;
                    const light = count >= INK_FLIP_AT;

                    return (
                      <div
                        key={hostel}
                        onMouseEnter={() => setHover({ condition, hostel, count })}
                        onMouseLeave={() => setHover(null)}
                        className={cx(
                          "relative flex h-12 items-center justify-center rounded-md text-[0.875rem] font-medium tabular-nums transition-transform duration-200",
                          count === 0 && "border border-line-soft",
                          isSpike && "ring-2 ring-[#d03b3b] ring-offset-1",
                          "hover:z-10 hover:scale-[1.06]",
                        )}
                        style={{
                          background: rampFor(count),
                          color: count === 0 ? "var(--color-ink-3)" : light ? "#fff" : "#0b0b0b",
                        }}
                        title={`${condition} · ${hostel}: ${count} case${count === 1 ? "" : "s"}`}
                      >
                        {count || "·"}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Hover readout — a live region, so it is not hover-only information. */}
        <p className="mt-4 min-h-[1.25rem] text-[0.8125rem] text-ink-2" aria-live="polite">
          {hover
            ? `${hover.condition} · ${hover.hostel}: ${hover.count} case${hover.count === 1 ? "" : "s"}`
            : ""}
        </p>
      </Card>

      {/* ── Totals by hostel — single series, so no legend ──────────── */}
      <Card className="p-5 sm:p-6">
        <h3 className="text-[1.25rem]">Total cases by hostel</h3>
        <ul className="mt-5 list-none space-y-3 p-0">
          {hostelTotals.map(({ hostel, total }) => (
            <li key={hostel} className="flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-[0.875rem] text-ink-2">{hostel}</span>
              <div className="h-6 flex-1 overflow-hidden rounded-md bg-canvas-soft">
                <div
                  className="h-full rounded-md bg-ink transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.max((total / maxHostelTotal) * 100, 3)}%` }}
                />
              </div>
              <span className="w-7 shrink-0 text-right text-[0.875rem] font-medium tabular-nums text-ink">
                {total}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* ── Table view — the accessibility fallback ─────────────────── */}
      <div>
        <Button
          variant="secondary"
          size="sm"
          icon={Table2}
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
        >
          {showTable ? "Hide data table" : "View as table"}
        </Button>

        {showTable ? (
          <Card className="mt-4 overflow-x-auto p-0 animate-fade-in">
            <table className="w-full border-collapse text-[0.875rem]">
              <caption className="px-5 pt-4 text-left text-[0.8125rem] text-ink-3">
                Case counts by condition and hostel. {data.total} records, {data.dateRange.from} to{" "}
                {data.dateRange.to}.
              </caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="px-5 py-3 text-left font-medium text-ink-2">
                    Condition
                  </th>
                  {hostels.map((hostel) => (
                    <th key={hostel} scope="col" className="px-3 py-3 text-right font-medium text-ink-2">
                      {hostel}
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-3 text-right font-medium text-ink-2">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={String(row.condition)} className="border-b border-line-soft last:border-0">
                    <th scope="row" className="px-5 py-2.5 text-left font-normal text-ink">
                      {String(row.condition)}
                    </th>
                    {hostels.map((hostel) => (
                      <td key={hostel} className="px-3 py-2.5 text-right tabular-nums text-ink-2">
                        {Number(row[hostel] ?? 0) || "—"}
                      </td>
                    ))}
                    <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">
                      {Number(row.total ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : null}
      </div>

      <p className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-ink-3">
        <Pill tone="warn" className="mt-0.5 shrink-0">
          Preview
        </Pill>
        {data.note}
      </p>
    </div>
  );
}
