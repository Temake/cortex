/**
 * POST /api/intake — the nurse logs a visit at the Health Centre.
 *
 * Body:   { complaint, vitals: { temp, bp, hr, rr?, spo2? }, medsGiven, hostel }
 * Returns { ok, visitId, twinId, events: [...], eventCount, knowledgeSource }
 *
 * Writes the complaint, the vitals and each medication onto the one sandbox
 * twin as health events, all stamped with the same `visitId` so /api/refer and
 * /api/summary can find them again.
 */
import { randomUUID } from "node:crypto";

import { handleError, ok, readJson, fail } from "@/lib/api";
import { connectSandboxTwin } from "@/lib/dtp";
import { holonStatus } from "@/lib/holon";
import { writeIntake, type IntakeInput } from "@/lib/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = await readJson<IntakeInput>(request);
  if ("error" in parsed) return parsed.error;

  const { complaint, vitals, medsGiven, hostel } = parsed.body;

  if (typeof complaint !== "string" || !complaint.trim()) {
    return fail("MISSING_COMPLAINT", "A presenting complaint is required.", 400);
  }

  try {
    const twin = connectSandboxTwin();
    const visitId = randomUUID();

    const result = await writeIntake(
      twin,
      { complaint: complaint.trim(), vitals, medsGiven, hostel },
      visitId,
    );

    return ok({
      visitId: result.visitId,
      twinId: twin.id,
      events: result.events,
      eventCount: result.events.length,
      knowledgeSource: result.knowledgeSource,
      holon: holonStatus(),
    });
  } catch (error) {
    return handleError(error);
  }
}
