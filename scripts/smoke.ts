/**
 * End-to-end smoke test for the six API routes.
 *
 *   npm run dev            # in one terminal
 *   npm run smoke          # in another
 *
 * Walks the whole demo narrative against a running server: intake -> refer ->
 * doctor history -> interaction check -> summary -> clusters. Prints the exact
 * JSON field names the frontend will bind to, and exits non-zero if any step
 * fails or the demo interaction stops flagging.
 */
const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

let failures = 0;

const line = (s = "") => console.log(s);
const step = (s: string) => console.log(`\n▸ ${s}`);

function assert(condition: unknown, message: string) {
  if (condition) {
    line(`  ✓ ${message}`);
  } else {
    line(`  ✗ ${message}`);
    failures += 1;
  }
}

async function call(method: "GET" | "POST", path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok || json.ok !== true) {
    line(`  ✗ ${method} ${path} -> ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
    failures += 1;
  }
  return json;
}

async function main() {
  line(`Smoke testing ${BASE}`);

  // ── 1. Nurse logs an intake ────────────────────────────────────────────────
  step("POST /api/intake");
  const intake = await call("POST", "/api/intake", {
    complaint: "Fever and headache for 3 days",
    vitals: { temp: 38.9, bp: "118/76", hr: 96 },
    medsGiven: ["Paracetamol 1g"],
    hostel: "Angola",
  });
  line(`  visitId       ${intake.visitId}`);
  line(`  twinId        ${intake.twinId}`);
  line(`  eventCount    ${intake.eventCount}`);
  assert(typeof intake.visitId === "string", "returns a visitId");
  assert(intake.eventCount === 3, "wrote 3 events (complaint + vitals + 1 med)");

  // ── 2. Nurse refers to OAUTHC ──────────────────────────────────────────────
  step("POST /api/refer");
  const refer = await call("POST", "/api/refer", {
    visitId: intake.visitId,
    reason: "Persistent fever, needs review at OAUTHC",
    ttlHours: 48,
  });
  const grantToken = refer.grantToken as string;
  line(`  referralId    ${refer.referralId}`);
  line(`  expiresAt     ${refer.expiresAt}`);
  line(`  link          ${String(refer.link).slice(0, 80)}…`);
  assert(typeof grantToken === "string" && grantToken.startsWith("ctx1."), "issues a referral token");
  assert(typeof refer.link === "string", "returns a shareable link for the QR code");
  assert(!JSON.stringify(refer).includes("eyJhbGciOiJIUzI1NiJ9"), "does NOT leak the sandbox grant token");

  // ── 3. Doctor opens the referral ───────────────────────────────────────────
  step("POST /api/doctor/history");
  const history = await call("POST", "/api/doctor/history", { grantToken });
  const events = history.events as Array<Record<string, unknown>>;
  const meds = history.medications as Array<Record<string, unknown>>;
  line(`  eventCount    ${history.eventCount}`);
  line(`  systems       ${JSON.stringify(history.systems)}`);
  line(`  medications   ${meds.map((m) => m.name).join(", ")}`);
  assert(Array.isArray(events) && events.length > 0, "returns scoped events");
  assert(meds.some((m) => String(m.name).toLowerCase().includes("warfarin")), "seeded Warfarin is visible");
  assert(
    events.every((e) => "code" in e && "value" in e && "occurredAt" in e && "system" in e),
    "every event has code / value / occurredAt / system",
  );

  // ── 4. Doctor checks a new prescription ────────────────────────────────────
  //
  // Tramadol vs the seeded Amitriptyline is the demo's headline: a MAJOR
  // serotonin-syndrome interaction that is genuinely present in HOLON's table.
  // (Warfarin + an NSAID is NOT in HOLON — see the note in scripts/seed.ts.)
  step("POST /api/interactions/check  (tramadol — should flag MAJOR)");
  const check = await call("POST", "/api/interactions/check", { grantToken, newDrug: "Tramadol" });
  line(`  hasInteraction ${check.hasInteraction}`);
  line(`  severity       ${check.severity}`);
  line(`  source         ${check.knowledgeSource}`);
  line(`  description    ${String(check.description).slice(0, 160)}…`);
  assert(check.hasInteraction === true, "flags an interaction against the seeded Amitriptyline");
  assert(String(check.severity).toLowerCase() === "major", "severity is major");
  assert(check.knowledgeSource !== "fallback", "the finding came from live HOLON, not the offline table");
  assert(typeof check.description === "string" && String(check.description).length > 20, "has a renderable description");
  assert(check.interaction !== null, "returns the primary interaction object");

  step("POST /api/interactions/check  (metronidazole — should flag against Warfarin)");
  const moderate = await call("POST", "/api/interactions/check", {
    grantToken,
    newDrug: "Metronidazole",
  });
  line(`  hasInteraction ${moderate.hasInteraction}  severity ${moderate.severity}`);
  assert(moderate.hasInteraction === true, "a common antibiotic also flags, so the demo is robust");

  step("POST /api/interactions/check  (vitamin C — should be clear)");
  const safe = await call("POST", "/api/interactions/check", { grantToken, newDrug: "Ascorbic acid" });
  line(`  hasInteraction ${safe.hasInteraction}`);
  line(`  description    ${String(safe.description).slice(0, 120)}…`);
  assert(safe.hasInteraction === false, "does not flag a benign drug");

  // The student path: no token at all, reads their own twin.
  step("POST /api/interactions/check  (NO token — the student self-check)");
  const student = await call("POST", "/api/interactions/check", { newDrug: "Tramadol" });
  line(`  hasInteraction ${student.hasInteraction}  severity ${student.severity}`);
  line(`  existingMeds   ${(student.existingMeds as unknown[]).length}`);
  assert(student.hasInteraction === true, "works with no grant token and still flags");
  assert(
    (student.existingMeds as unknown[]).length > 0,
    "reads the student's own medication list without a grant",
  );

  step("POST /api/interactions/check  (nonsense drug — resolves cleanly, no crash)");
  const unknown = await call("POST", "/api/interactions/check", { grantToken, newDrug: "zzzqqq" });
  assert(unknown.resolvedNewDrug === false, "reports the drug could not be resolved");
  assert(unknown.hasInteraction === false, "does not claim an interaction for an unknown drug");

  // ── 5. Student summary ─────────────────────────────────────────────────────
  step("POST /api/summary");
  const summary = await call("POST", "/api/summary", { grantToken });
  line(`  visitId       ${summary.visitId}`);
  line(`  summary       ${String(summary.summary).slice(0, 200)}…`);
  assert(typeof summary.summary === "string" && String(summary.summary).length > 50, "returns a summary paragraph");
  assert(Array.isArray(summary.lines) && (summary.lines as unknown[]).length > 0, "returns summary lines");
  assert(summary.visitId === intake.visitId, "summarises the visit we just logged");

  step("POST /api/summary  (no token — falls back to the sandbox twin)");
  const summaryNoToken = await call("POST", "/api/summary", {});
  assert(typeof summaryNoToken.summary === "string", "works without a token");

  // ── 6. Cluster preview ─────────────────────────────────────────────────────
  step("GET /api/clusters/mock");
  const clusters = await call("GET", "/api/clusters/mock");
  line(`  total         ${clusters.total}`);
  line(`  conditions    ${JSON.stringify(clusters.conditions)}`);
  line(`  hostels       ${JSON.stringify(clusters.hostels)}`);
  line(`  spike         ${JSON.stringify(clusters.spike)}`);
  assert(clusters.mocked === true, "is labelled as mocked");
  assert(Array.isArray(clusters.records) && (clusters.records as unknown[]).length >= 15, "has 15+ records");
  assert((clusters.spike as { count: number }).count >= 4, "has a visible spike");

  // ── Error paths ────────────────────────────────────────────────────────────
  step("Error handling");
  const badToken = await fetch(`${BASE}/api/doctor/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grantToken: "ctx1.bogus.bogus" }),
  });
  const badBody = (await badToken.json()) as Record<string, unknown>;
  assert(badBody.ok === false, "rejects a forged referral token");
  line(`  -> ${JSON.stringify(badBody.error)}`);

  const noComplaint = await fetch(`${BASE}/api/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vitals: { temp: 37 } }),
  });
  const noComplaintBody = (await noComplaint.json()) as Record<string, unknown>;
  assert(noComplaintBody.ok === false, "rejects an intake with no complaint");
  line(`  -> ${JSON.stringify(noComplaintBody.error)}`);

  line(failures === 0 ? "\n✓ All smoke checks passed." : `\n✗ ${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\n✗ Smoke run crashed:", error?.message ?? error);
  console.error("  Is the dev server running on " + BASE + "?");
  process.exit(1);
});
