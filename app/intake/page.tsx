/**
 * /intake — the nurse logs a visit at the Health Centre.
 *
 * Posts to /api/intake, which writes the complaint, the vitals and one event per
 * medication onto the sandbox twin, then routes to the referral step.
 *
 * The side panel mirrors exactly what will be written to the twin. During the
 * demo that makes the platform's data model visible instead of hiding it behind
 * a form, and it doubles as a pre-submit check for the nurse.
 */
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  ClipboardPlus,
  MapPin,
  Plus,
  Stethoscope,
  X,
} from "lucide-react";

import { CareBridgeMark, PageShell } from "@/components/site-nav";
import { Button, Card, ErrorNote, Eyebrow, Field, Pill, Reveal, cx } from "@/components/ui";
import { ApiClientError, postJson, type IntakeResponse } from "@/lib/contracts";

/** OAU halls of residence, including the ones the mock cluster data uses. */
const HOSTELS = [
  "Angola",
  "Awo",
  "Mozambique",
  "Alumni",
  "Fajuyi",
  "Ladoke Akintola",
  "Moremi",
  "ETF / Postgraduate",
  "Off campus",
];

const COMMON_COMPLAINTS = [
  "Fever and headache for 3 days",
  "Abdominal pain and vomiting",
  "Cough and sore throat",
  "Diarrhoea since yesterday",
];

const VITAL_FIELDS = [
  { key: "temp", label: "Temperature (°C)", placeholder: "38.9", mode: "decimal" as const },
  { key: "bp", label: "Blood pressure", placeholder: "118/76", mode: "text" as const },
  { key: "hr", label: "Heart rate (bpm)", placeholder: "96", mode: "numeric" as const },
  { key: "rr", label: "Resp. rate (/min)", placeholder: "18", mode: "numeric" as const },
  { key: "spo2", label: "SpO₂ (%)", placeholder: "98", mode: "numeric" as const },
] satisfies Array<{ key: string; label: string; placeholder: string; mode: "decimal" | "numeric" | "text" }>;

type VitalKey = (typeof VITAL_FIELDS)[number]["key"];

export default function IntakePage() {
  const router = useRouter();

  const [complaint, setComplaint] = useState("");
  const [vitals, setVitals] = useState<Record<VitalKey, string>>({
    temp: "",
    bp: "",
    hr: "",
    rr: "",
    spo2: "",
  });
  const [hostel, setHostel] = useState("");
  const [meds, setMeds] = useState<string[]>([]);
  const [medDraft, setMedDraft] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [touched, setTouched] = useState(false);

  const complaintError = touched && !complaint.trim() ? "A presenting complaint is required." : null;

  function addMed() {
    const value = medDraft.trim();
    if (!value) return;
    // Keep the list unique — a duplicate medication is almost always a slip.
    setMeds((current) => (current.includes(value) ? current : [...current, value]));
    setMedDraft("");
  }

  /** Mirrors the events /api/intake will create, for the side panel. */
  const preview = useMemo(() => {
    const rows: Array<{ system: string; type: string; value: string }> = [];

    if (complaint.trim()) {
      rows.push({ system: "general", type: "diagnosis", value: complaint.trim() });
    }

    const bits = [
      vitals.temp && `Temp ${vitals.temp}°C`,
      vitals.bp && `BP ${vitals.bp}`,
      vitals.hr && `HR ${vitals.hr} bpm`,
      vitals.rr && `RR ${vitals.rr}/min`,
      vitals.spo2 && `SpO₂ ${vitals.spo2}%`,
    ].filter(Boolean);

    if (bits.length) {
      rows.push({ system: "cardiovascular", type: "vital_sign", value: bits.join(" · ") });
    }

    for (const med of meds) {
      rows.push({ system: "medication", type: "medication", value: med });
    }

    return rows;
  }, [complaint, vitals, meds]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!complaint.trim()) return;

    setPending(true);
    setError(null);

    try {
      const result = await postJson<IntakeResponse>("/api/intake", {
        complaint: complaint.trim(),
        // Send only the vitals that were actually filled in.
        vitals: Object.fromEntries(Object.entries(vitals).filter(([, v]) => v !== "")),
        medsGiven: meds,
        hostel: hostel || null,
      });
      router.push(`/intake/${result.visitId}/refer`);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? { code: err.code, message: err.message }
          : { code: "UNKNOWN", message: "Something went wrong logging this visit." },
      );
      setPending(false);
    }
  }

  return (
    <PageShell>
      <Reveal>
        <Eyebrow className="mb-3.5">Nurse · Jaja Health Centre</Eyebrow>
        <h1 className="text-[2.25rem] leading-[1.1] sm:text-[2.75rem]">
          Log a visit,
          <span className="headline-mute"> onto the twin.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-2">
          Everything recorded here becomes a health event on the student&apos;s digital
          twin, and travels with them on referral.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:gap-8">
        {/* ── Form ───────────────────────────────────────────────────── */}
        <Reveal delay={80}>
          <form onSubmit={submit} noValidate className="space-y-6">
            {error ? <ErrorNote code={error.code} message={error.message} /> : null}

            <Card className="p-6 sm:p-7">
              <h2 className="mb-5 flex items-center gap-2.5 text-[1.125rem]">
                <Stethoscope size={17} className="text-ink-3" aria-hidden />
                Presenting complaint
              </h2>

              <Field
                label="What has the student come in with?"
                htmlFor="complaint"
                error={complaintError}
              >
                <textarea
                  id="complaint"
                  className={cx("input", complaintError && "input-invalid")}
                  placeholder="Fever and headache for 3 days…"
                  value={complaint}
                  aria-invalid={complaintError ? true : undefined}
                  onChange={(e) => setComplaint(e.target.value)}
                  onBlur={() => setTouched(true)}
                />
              </Field>

              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {COMMON_COMPLAINTS.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => setComplaint(text)}
                    className="pill transition-colors hover:border-ink-3 hover:text-ink"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-6 sm:p-7">
              <h2 className="mb-5 flex items-center gap-2.5 text-[1.125rem]">
                <Activity size={17} className="text-ink-3" aria-hidden />
                Vitals
              </h2>

              <div className="grid gap-4 sm:grid-cols-3">
                {VITAL_FIELDS.map((field) => (
                  <Field key={field.key} label={field.label} htmlFor={field.key}>
                    <input
                      id={field.key}
                      className="input"
                      inputMode={field.mode === "text" ? undefined : field.mode}
                      placeholder={field.placeholder}
                      value={vitals[field.key]}
                      onChange={(e) =>
                        setVitals((current) => ({ ...current, [field.key]: e.target.value }))
                      }
                    />
                  </Field>
                ))}
              </div>
            </Card>

            <Card className="p-6 sm:p-7">
              <h2 className="mb-5 flex items-center gap-2.5 text-[1.125rem]">
                <ClipboardPlus size={17} className="text-ink-3" aria-hidden />
                Medications given
              </h2>

              <Field
                label="Add a medication"
                htmlFor="med"
                hint="One at a time. Each becomes its own event, resolved to a drug concept."
              >
                <div className="flex gap-2">
                  <input
                    id="med"
                    className="input"
                    placeholder="Paracetamol 1g"
                    value={medDraft}
                    onChange={(e) => setMedDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        // Enter adds a chip; it must not submit the whole visit.
                        e.preventDefault();
                        addMed();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addMed}
                    disabled={!medDraft.trim()}
                    icon={Plus}
                  >
                    Add
                  </Button>
                </div>
              </Field>

              {meds.length ? (
                <ul className="mt-4 flex list-none flex-wrap gap-2 p-0">
                  {meds.map((med) => (
                    <li key={med}>
                      <span className="pill pill-info gap-1.5 py-1 pl-2.5 pr-1.5">
                        {med}
                        <button
                          type="button"
                          onClick={() => setMeds((c) => c.filter((m) => m !== med))}
                          aria-label={`Remove ${med}`}
                          className="flex size-4 items-center justify-center rounded-full transition-colors hover:bg-black/10"
                        >
                          <X size={11} aria-hidden />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>

            <Card className="p-6 sm:p-7">
              <h2 className="mb-5 flex items-center gap-2.5 text-[1.125rem]">
                <MapPin size={17} className="text-ink-3" aria-hidden />
                Location
              </h2>

              <Field
                label="Hall of residence"
                htmlFor="hostel"
                hint="Tagged on every event — this is what the Phase 2 cluster view aggregates on."
              >
                <select
                  id="hostel"
                  className="input"
                  value={hostel}
                  onChange={(e) => setHostel(e.target.value)}
                >
                  <option value="">Not recorded</option>
                  {HOSTELS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </Field>
            </Card>

            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" size="lg" pending={pending} iconRight={ArrowRight}>
                {pending ? "Writing to the twin…" : "Log visit and continue"}
              </Button>
              <p className="text-[0.8125rem] text-ink-3">
                {preview.length} event{preview.length === 1 ? "" : "s"} will be created
              </p>
            </div>
          </form>
        </Reveal>

        {/* ── Live preview of what gets written ──────────────────────── */}
        <Reveal delay={160}>
          <div className="lg:sticky lg:top-24">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-line bg-canvas-soft px-5 py-4">
                <CareBridgeMark size={16} />
                <p className="text-[0.9375rem] font-medium">Twin events preview</p>
              </div>

              {preview.length ? (
                <ul className="list-none divide-y divide-line-soft p-0">
                  {preview.map((row, i) => (
                    <li key={`${row.type}-${i}`} className="px-5 py-4">
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        <Pill mono>{row.type}</Pill>
                        <Pill>{row.system}</Pill>
                      </div>
                      <p className="text-[0.9375rem] leading-relaxed text-ink">{row.value}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-10 text-center text-[0.9375rem] text-ink-3">
                  Fill the form and the events will appear here.
                </p>
              )}
            </Card>

            <p className="mt-4 px-1 text-[0.8125rem] leading-relaxed text-ink-3">
              Written to the sandbox twin through the grant-authed provider events
              endpoint. Nothing is sent until you submit.
            </p>
          </div>
        </Reveal>
      </div>
    </PageShell>
  );
}
