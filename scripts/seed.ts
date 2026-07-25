/**
 * One-off seed script for the sandbox twin.
 *
 *   npm run seed          # adds any missing prior events (idempotent)
 *   npm run seed -- --check   # verifies only, writes nothing
 *
 * Puts a small prior history on the single sandbox twin so the live demo has
 * something real to collide with.
 *
 * WHICH DRUGS, AND WHY THESE:
 * the demo pair has to exist in HOLON's actual interaction table, which is
 * DrugBank 5.1 + UMLS MED-RT and is real but uneven. Probing it directly:
 *
 *   Amitriptyline + Tramadol      -> MAJOR    (serotonin syndrome)   ✓
 *   Warfarin + Metronidazole      -> moderate                        ✓
 *   Warfarin + Ciprofloxacin      -> moderate                        ✓
 *   Warfarin + Fluconazole        -> moderate                        ✓
 *   Warfarin + Ibuprofen          -> NOT PRESENT                     ✗
 *   Warfarin + Diclofenac/Aspirin -> NOT PRESENT                     ✗
 *
 * So the textbook warfarin/NSAID pair is not in HOLON and cannot be the demo.
 * We seed Amitriptyline (for the MAJOR headline when Tramadol is prescribed) and
 * Warfarin (so the common antibiotics a judge might suggest also flag). Both
 * resolve through the DrugBank-preferring picker in lib/holon.ts.
 */
import { randomUUID } from "node:crypto";

import { connectSandboxTwin } from "../lib/dtp";
import { checkDrugList, DOMAIN, holonStatus, resolveConcept } from "../lib/holon";
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
const CHECK_ONLY = args.has("--check");

/** The prior medications the demo depends on. Matched by name on re-run. */
const SEED_MEDS = [
  {
    match: "amitriptyline",
    value: "Amitriptyline 25mg at night",
    description: "Started at OAUTHC for migraine prophylaxis. Ongoing.",
  },
  {
    match: "warfarin",
    value: "Warfarin 5mg daily",
    description: "Ongoing anticoagulation, started at OAUTHC.",
  },
];

/** The drug the doctor prescribes in the demo, and the severity it must reach. */
const DEMO_PRESCRIPTION = "Tramadol";

const line = (s = "") => console.log(s);
const step = (s: string) => console.log(`\n▸ ${s}`);

async function main() {
  step("Connecting to the sandbox twin");
  const twin = connectSandboxTwin();
  line(`  twinId  ${twin.id}`);
  line(`  scope   systems=${twin.grant.systems ?? "ALL"} eventTypes=${twin.grant.eventTypes ?? "ALL"}`);

  const before = await readCareEvents(twin);
  const existingMeds = extractMedications(before);
  line(`  twin holds ${before.length} events, ${existingMeds.length} medications`);

  if (CHECK_ONLY) {
    await verify(twin);
    return;
  }

  // Only write what is missing, so re-running does not pile up duplicates.
  const missing = SEED_MEDS.filter(
    (seed) => !existingMeds.some((med) => med.name.toLowerCase().includes(seed.match)),
  );

  if (!missing.length) {
    line(`\n✓ All ${SEED_MEDS.length} seed medications are already on the twin.`);
  } else {
    step(`Writing ${missing.length} missing medication event(s)`);

    const visitId = randomUUID();
    const occurredAt = new Date(Date.now() - 42 * 24 * 3600 * 1000).toISOString();
    const base = {
      visitId,
      hostel: "Angola",
      app: APP_TAG,
      recordedBy: "nurse" as const,
      seed: "carebridge-seed-v2",
    };

    for (const seed of missing) {
      const drug = await resolveConcept(seed.value, DOMAIN.drug);
      if (!drug) {
        line(`  ! could not resolve "${seed.value}" — writing without a concept id`);
      }

      const event = await twin.flag(CARE_SYSTEMS.medication, {
        eventType: CARE_EVENT_TYPES.medication,
        occurredAt,
        title: `[seed] Medication: ${drug?.conceptName ?? seed.match}`,
        description: seed.description,
        data: {
          ...base,
          code: "MEDICATION",
          value: seed.value,
          conceptId: drug?.conceptId ?? null,
          conceptName: drug?.conceptName ?? null,
          vocabularyId: drug?.vocabularyId ?? null,
          ongoing: true,
        },
      });

      line(
        `  ✓ ${seed.value}  [${drug?.vocabularyId ?? "unresolved"} ${drug?.conceptId ?? "-"}, source=${drug?.source ?? "-"}]`,
      );
      line(`      event ${event.id}`);
    }

    // A vitals reading and a complaint, so the seeded visit reads as a real one.
    if (!before.some((e) => e.title.includes("[seed] Vitals"))) {
      const vitals = { temp: 36.8, bp: "118/76", hr: 74 };
      await twin.flag(CARE_SYSTEMS.vitals, {
        eventType: CARE_EVENT_TYPES.vitals,
        occurredAt,
        title: "[seed] Vitals at intake",
        description: formatVitals(vitals),
        data: { ...base, code: "VITALS", value: formatVitals(vitals), vitals },
      });
      line(`  ✓ vitals  ${formatVitals(vitals)}`);

      const complaintText = "Routine medication review, no new symptoms";
      const condition = await resolveConcept(complaintText, DOMAIN.condition);
      await twin.flag(CARE_SYSTEMS.complaint, {
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
      line(`  ✓ complaint  ${complaintText}`);
    }
  }

  await verify(twin);
}

async function verify(twin: ReturnType<typeof connectSandboxTwin>) {
  step("Verifying the twin state");
  const events = await readCareEvents(twin);
  const meds = extractMedications(events);

  line(`  twin holds ${events.length} events, ${meds.length} medications:`);
  for (const m of meds.slice(0, 12)) line(`    - ${m.name}`);
  if (meds.length > 12) line(`    … and ${meds.length - 12} more`);

  for (const seed of SEED_MEDS) {
    const present = meds.some((m) => m.name.toLowerCase().includes(seed.match));
    line(`  ${present ? "✓" : "✗"} ${seed.match} on record`);
    if (!present) process.exitCode = 1;
  }

  step(`Confirming "${DEMO_PRESCRIPTION}" flags against this twin`);

  // Resolve every medication by name, exactly as /api/interactions/check does.
  const resolvedMeds = await Promise.all(meds.map((m) => resolveConcept(m.name, DOMAIN.drug)));
  const newDrug = await resolveConcept(DEMO_PRESCRIPTION, DOMAIN.drug);

  if (!newDrug) {
    line(`  ✗ could not resolve "${DEMO_PRESCRIPTION}".`);
    process.exitCode = 1;
    return;
  }

  const holonIds: number[] = [];
  const fallbackIds: number[] = [];
  for (const r of resolvedMeds) {
    if (!r) continue;
    (r.source === "fallback" ? fallbackIds : holonIds).push(r.conceptId);
  }
  (newDrug.source === "fallback" ? fallbackIds : holonIds).push(newDrug.conceptId);

  const { interactions, source, offlineOnlyCount } = await checkDrugList({ holonIds, fallbackIds });
  const relevant = interactions.filter(
    (i) => i.drugA === newDrug.conceptId || i.drugB === newDrug.conceptId,
  );

  line(`  ${DEMO_PRESCRIPTION} -> ${newDrug.vocabularyId} ${newDrug.conceptId}`);
  line(`  checked ${holonIds.length} HOLON + ${fallbackIds.length} offline ids (source: ${source}, offlineOnly: ${offlineOnlyCount})`);

  if (!relevant.length) {
    line(`\n  ✗ Prescribing ${DEMO_PRESCRIPTION} would NOT flag. The demo needs a different pair.`);
    process.exitCode = 1;
    return;
  }

  const top = relevant[0];
  line(`\n  ✓ ${relevant.length} interaction(s); most severe is ${top.severity.toUpperCase()}:`);
  line(`      ${top.drugAName} + ${top.drugBName}`);
  line(`      ${top.clinicalEffect}`);
  line(`      Management: ${top.management}`);
  line(`      Source: ${top.source} (evidence: ${top.evidenceGrade})`);

  const status = holonStatus();
  line(`\n  HOLON live: ${status.live ? "yes" : `no (${status.lastError})`}`);
  line(`\n✓ Twin is ready for the demo. Leave it in this state.`);
}

main().catch((error) => {
  console.error("\n✗ Seed failed:", error?.code ?? "", error?.message ?? error);
  if (error?.details) console.error("  details:", JSON.stringify(error.details).slice(0, 500));
  process.exit(1);
});
