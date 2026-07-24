/**
 * GET /api/clusters/mock — the Phase 2 preview chart's data source.
 *
 * Returns { ok, mocked: true, records, matrix, conditions, hostels, spike,
 *           total, dateRange, note }
 *
 * Reads /data/mock-clusters.json from disk. Deliberately makes NO Ontomorph
 * call: our sandbox account has a single twin, so live multi-twin clustering
 * is out of scope tonight. `mocked: true` and `note` exist so the UI can label
 * the view honestly, as the build scope requires.
 *
 * `records` is the raw {condition, hostel, date} list; `matrix` is the
 * pre-aggregated condition x hostel count grid, so ClusterChart can render
 * without reducing anything itself.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { handleError, ok } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClusterRecord = { condition: string; hostel: string; date: string };

const NOTE =
  "Preview — mocked data. Live multi-twin outbreak clustering arrives in Phase 2, once more than one sandbox twin is available.";

export async function GET() {
  try {
    const file = path.join(process.cwd(), "data", "mock-clusters.json");
    const records = JSON.parse(await readFile(file, "utf8")) as ClusterRecord[];

    const conditions = [...new Set(records.map((r) => r.condition))].sort();
    const hostels = [...new Set(records.map((r) => r.hostel))].sort();

    const countOf = (condition: string, hostel: string) =>
      records.filter((r) => r.condition === condition && r.hostel === hostel).length;

    // One row per condition, with a count per hostel — the shape a grouped bar
    // chart or heatmap wants directly.
    const matrix = conditions.map((condition) => {
      const row: Record<string, string | number> = { condition };
      let total = 0;
      for (const hostel of hostels) {
        const count = countOf(condition, hostel);
        row[hostel] = count;
        total += count;
      }
      row.total = total;
      return row;
    });

    // The visible spike the demo points at.
    let spike = { condition: "", hostel: "", count: 0 };
    for (const condition of conditions) {
      for (const hostel of hostels) {
        const count = countOf(condition, hostel);
        if (count > spike.count) spike = { condition, hostel, count };
      }
    }

    const dates = records.map((r) => r.date).sort();

    return ok({
      mocked: true,
      note: NOTE,
      total: records.length,
      records,
      matrix,
      conditions,
      hostels,
      spike,
      dateRange: { from: dates[0] ?? null, to: dates.at(-1) ?? null },
    });
  } catch (error) {
    return handleError(error);
  }
}
