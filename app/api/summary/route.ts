/**
 * POST /api/summary — the student's plain-language view of their latest visit.
 *
 * Body:   { grantToken? , twinId? , visitId? }  — all optional; with none of
 *         them the route summarises the one sandbox twin's latest visit.
 * Returns { ok, twinId, visitId, occurredAt, summary, lines, items, ... }
 *
 * The explanation is templated from HOLON-resolved concept names, not
 * generated. The build scope calls this out: AI narration is a real-twin
 * feature and the sandbox host returns null for it, so there is nothing to
 * narrate with. `summary` is one paragraph; `lines` is the same content split
 * into sentences for bullet rendering.
 */
import { AccessError, applyScope, openTwinSession } from "@/lib/access";
import { handleError, ok, readJson } from "@/lib/api";
import { connectSandboxTwin } from "@/lib/dtp";
import { DOMAIN, holonStatus, resolveConcept, type KnowledgeSource } from "@/lib/holon";
import { fail } from "@/lib/api";
import { ReferralTokenError } from "@/lib/referral";
import {
  groupVisits,
  readCareEvents,
  type CareEvent,
} from "@/lib/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SummaryBody = { grantToken?: string; token?: string; twinId?: string; visitId?: string };

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

function friendlyDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "an earlier date"
    : date.toLocaleDateString("en-GB", DATE_FORMAT);
}

type SummaryItem = {
  label: string;
  value: string;
  conceptName: string | null;
  vocabularyId: string | null;
  code: string;
};

export async function POST(request: Request) {
  const parsed = await readJson<SummaryBody>(request);
  if ("error" in parsed) return parsed.error;

  const raw = parsed.body.grantToken ?? parsed.body.token;

  try {
    // A grant/referral token scopes the read; without one we fall back to the
    // single sandbox twin, which is what the /student/[twinId] page does.
    let events: CareEvent[];
    let twinId: string;

    if (raw && raw.trim()) {
      const session = openTwinSession(raw);
      events = applyScope(await readCareEvents(session.twin), session);
      twinId = session.twinId;
    } else {
      const twin = connectSandboxTwin();
      events = await readCareEvents(twin);
      twinId = twin.id;
    }

    const visits = groupVisits(events);
    const visit = parsed.body.visitId
      ? visits.find((v) => v.visitId === parsed.body.visitId)
      : visits[0];

    if (!visit) {
      return ok({
        twinId,
        visitId: null,
        occurredAt: null,
        summary:
          "There is no CareBridge visit recorded for this patient yet. Once a nurse logs an intake at the Health Centre, the summary will appear here.",
        lines: [],
        items: [],
        knowledgeSource: null,
        holon: holonStatus(),
      });
    }

    const complaint = visit.events.find((e) => e.code === "COMPLAINT");
    const vitals = visit.events.find((e) => e.code === "VITALS");
    const meds = visit.events.filter((e) => e.code === "MEDICATION");

    let knowledgeSource: KnowledgeSource | null = null;
    const items: SummaryItem[] = [];

    // Resolve the complaint's concept — reuse what intake stored, and only ask
    // HOLON again if the event predates concept resolution.
    let complaintConceptName = complaint?.conceptName ?? null;
    let complaintVocabulary = complaint?.vocabularyId ?? null;
    if (complaint && !complaintConceptName) {
      const hit = await resolveConcept(complaint.value, DOMAIN.condition);
      if (hit) {
        complaintConceptName = hit.conceptName;
        complaintVocabulary = hit.vocabularyId;
        knowledgeSource = hit.source;
      }
    }

    if (complaint) {
      items.push({
        label: "What you came in with",
        value: complaint.value,
        conceptName: complaintConceptName,
        vocabularyId: complaintVocabulary,
        code: complaint.code,
      });
    }

    if (vitals) {
      items.push({
        label: "Your measurements",
        value: vitals.value,
        conceptName: "Vital signs",
        vocabularyId: null,
        code: vitals.code,
      });
    }

    for (const med of meds) {
      let name = med.conceptName;
      let vocab = med.vocabularyId;
      if (!name) {
        const hit = await resolveConcept(med.value, DOMAIN.drug);
        if (hit) {
          name = hit.conceptName;
          vocab = hit.vocabularyId;
          knowledgeSource = hit.source;
        }
      }
      items.push({
        label: "Medicine you were given",
        value: med.value,
        conceptName: name,
        vocabularyId: vocab,
        code: med.code,
      });
    }

    // ── Templated plain-language explanation ────────────────────────────────
    const lines: string[] = [];
    const where = complaint?.hostel ? `the Health Centre (${complaint.hostel})` : "the Health Centre";
    lines.push(`You were seen at ${where} on ${friendlyDate(visit.occurredAt)}.`);

    if (complaint) {
      lines.push(
        complaintConceptName
          ? `You told the nurse about: ${complaint.value}. In clinical terms this was recorded as "${complaintConceptName}"${complaintVocabulary ? ` (${complaintVocabulary})` : ""}.`
          : `You told the nurse about: ${complaint.value}.`,
      );
    }

    if (vitals) {
      lines.push(`The nurse measured your vital signs: ${vitals.value}.`);
    }

    if (meds.length) {
      const names = meds.map((m) => m.conceptName ?? m.value);
      lines.push(
        `You were given ${names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`}.`,
      );
    } else {
      lines.push("No medicine was given to you at this visit.");
    }

    lines.push(
      "This record now travels with you. If you are referred to OAUTHC, the doctor there can see this visit straight away, so you will not need to repeat the same story or the same tests.",
    );

    return ok({
      twinId,
      visitId: visit.visitId,
      occurredAt: visit.occurredAt,
      hostel: complaint?.hostel ?? null,
      summary: lines.join(" "),
      lines,
      items,
      eventCount: visit.events.length,
      knowledgeSource,
      holon: holonStatus(),
    });
  } catch (error) {
    if (error instanceof ReferralTokenError) return fail(error.code, error.message, 403);
    if (error instanceof AccessError) return fail(error.code, error.message, error.status);
    return handleError(error);
  }
}
