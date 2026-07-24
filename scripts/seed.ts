/**
 * One-off seed script for the sandbox twin.
 *
 *   npm run seed          # writes the prior events, skips if already seeded
 *   npm run seed -- --force   # writes them again anyway
 *   npm run seed -- --check   # verifies only, writes nothing
 *
 * Puts a small prior history on the single sandbox twin so the live demo has
 * something real to work against: an existing Warfarin prescription (the thing
 * a new NSAID prescription will collide with), a blood-pressure reading, and
 * an earlier presenting complaint.
 *
 * Run it once, confirm the output, then leave the twin alone.
 */
import { randomUUID } from "node:crypto";

import { connectSandboxTwin } from "../lib/dtp";
import { checkDrugList, holonStatus, resolveConcept } from "../lib/holon";
import {
  APP_TAG,
  CARE_EVENT_TYPES,
  CARE_SYSTEMS,
  extractMedications,
  formatVitals,
  readCareEvents,
} from "../lib/visits";

process.loadEnvFile(".env.local");

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const CHECK_ONLY = args.has("--check");

/** Marks the events this script writes, so re-runs can detect them. */
const SEED_MARKER = "carebridge-seed-v1";

const line = (s = "") => console.log(s);
const step = (s: string) => console.log(`\n▸ ${s}`);

async function main() {
  step("Connecting to the sandbox twin");
  const twin = connectSandboxTwin();
  line(`  twinId  ${twin.id}`);
  line(`  grantId ${twin.grant.grantId}`);
  line(`  scope   systems=${twin.grant.systems ?? "ALL"} eventTypes=${twin.grant.eventTypes ?? "ALL"}`);

  const before = await readCareEvents(twin);
  line(`  twin currently holds ${before.length} events`);

  const alreadySeeded = before.filter((e) => e.title.includes("[seed]"));
  if (alreadySeeded.length && !FORCE && !CHECK_ONLY) {
    line(`\n✓ Twin already seeded (${alreadySeeded.length} seed events found). Nothing to do.`);
    line("  Re-run with  --force  to seed again, or  --check  to verify only.");
    await verify(twin);
    return;
  }

  if (CHECK_ONLY) {
    await verify(twin);
    return;
  }

  step("Resolving drug concepts through HOLON");
  const warfarin = await resolveConcept("warfarin", "Drug");
  const ibuprofen = await resolveConcept("ibuprofen", "Drug");

  if (!warfarin || !ibuprofen) {
    throw new Error("Could not resolve warfarin/ibuprofen through HOLON or the offline fallback.");
  }

  line(`  Warfarin   conceptId=${warfarin.conceptId} (${warfarin.vocabularyId}, source=${warfarin.source})`);
  line(`  Ibuprofen  conceptId=${ibuprofen.conceptId} (${ibuprofen.vocabularyId}, source=${ibuprofen.source})`);
  if (warfarin.source === "fallback") {
    line("  ! HOLON is unreachable — concept ids came from the offline fallback table.");
  }

  step("Writing prior events onto the twin");

  // A prior visit, six weeks ago, so it reads as history rather than today.
  const priorVisitId = randomUUID();
  const occurredAt = new Date(Date.now() - 42 * 24 * 3600 * 1000).toISOString();
  const base = {
    visitId: priorVisitId,
    hostel: "Angola",
    app: APP_TAG,
    recordedBy: "nurse" as const,
    seed: SEED_MARKER,
  };

  // 1. The existing medication — the whole point of the seed.
  const med = await twin.flag(CARE_SYSTEMS.medication, {
    eventType: CARE_EVENT_TYPES.medication,
    occurredAt,
    title: "[seed] Medication: Warfarin",
    description: "Warfarin 5mg daily — ongoing anticoagulation, started at OAUTHC.",
    data: {
      ...base,
      code: "MEDICATION",
      value: "Warfarin 5mg daily",
      conceptId: warfarin.conceptId,
      conceptName: warfarin.conceptName,
      vocabularyId: warfarin.vocabularyId,
      ongoing: true,
    },
  });
  line(`  ✓ medication  ${med.id}  Warfarin 5mg daily`);

  // 2. A vitals reading from that visit.
  const vitals = { temp: 36.8, bp: "118/76", hr: 74 };
  const vital = await twin.flag(CARE_SYSTEMS.vitals, {
    eventType: CARE_EVENT_TYPES.vitals,
    occurredAt,
    title: "[seed] Vitals at intake",
    description: formatVitals(vitals),
    data: { ...base, code: "VITALS", value: formatVitals(vitals), vitals },
  });
  line(`  ✓ vital_sign  ${vital.id}  ${formatVitals(vitals)}`);

  // 3. The complaint that visit was about.
  const complaintText = "Routine anticoagulation review, no bleeding";
  const condition = await resolveConcept(complaintText, "Condition");
  const complaint = await twin.flag(CARE_SYSTEMS.complaint, {
    eventType: CARE_EVENT_TYPES.complaint,
    occurredAt,
    title: "[seed] Presenting complaint",
    description: complaintText,
    data: {
      ...base,
      code: "COMPLAINT",
      value: complaintText,
      conceptId: condition?.conceptId ?? null,
      conceptName: condition?.conceptName ?? null,
      vocabularyId: condition?.vocabularyId ?? null,
    },
  });
  line(`  ✓ diagnosis   ${complaint.id}  ${complaintText}`);
  line(`\n  seeded visitId ${priorVisitId}`);

  await verify(twin);
}

async function verify(twin: ReturnType<typeof connectSandboxTwin>) {
  step("Verifying the twin state");
  const events = await readCareEvents(twin);
  const meds = extractMedications(events);

  line(`  twin now holds ${events.length} events`);
  line(`  medications on record (${meds.length}):`);
  for (const m of meds) {
    line(`    - ${m.name}${m.conceptId ? `  [conceptId ${m.conceptId}]` : "  [unresolved]"}`);
  }

  if (!meds.length) {
    line("\n  ✗ No medications found — the interaction check will have nothing to flag.");
    process.exitCode = 1;
    return;
  }

  step("Confirming the demo interaction actually flags");
  const ibuprofen = await resolveConcept("ibuprofen", "Drug");
  const existingIds = meds.map((m) => m.conceptId).filter((id): id is number => id != null);

  if (!ibuprofen || !existingIds.length) {
    line("  ✗ Could not build the drug list for the check.");
    process.exitCode = 1;
    return;
  }

  const { interactions, source } = await checkDrugList([...existingIds, ibuprofen.conceptId]);
  const relevant = interactions.filter(
    (i) => i.drugA === ibuprofen.conceptId || i.drugB === ibuprofen.conceptId,
  );

  line(`  checked [${[...existingIds, ibuprofen.conceptId].join(", ")}]  (source: ${source})`);

  if (!relevant.length) {
    line("\n  ✗ Prescribing ibuprofen would NOT flag anything. The demo needs a different pair.");
    process.exitCode = 1;
    return;
  }

  const top = relevant[0];
  line(`\n  ✓ Prescribing ibuprofen flags a ${top.severity.toUpperCase()} interaction:`);
  line(`      ${top.drugAName} + ${top.drugBName}`);
  line(`      ${top.clinicalEffect}`);
  line(`      Management: ${top.management}`);

  const status = holonStatus();
  line(`\n  HOLON live: ${status.live ? "yes" : `no (${status.lastError})`}`);
  line(`\n✓ Twin is ready for the demo. Leave it in this state.`);
}

main().catch((error) => {
  console.error("\n✗ Seed failed:", error?.code ?? "", error?.message ?? error);
  if (error?.details) console.error("  details:", JSON.stringify(error.details).slice(0, 500));
  process.exit(1);
});
