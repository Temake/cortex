/**
 * /doctor/[grantId]/prescribe — check a new drug before prescribing it.
 *
 * Posts to /api/interactions/check, which resolves the drug through HOLON
 * concepts, pulls the twin's existing medications, and runs the whole list
 * through the interaction check.
 *
 * The token travels in `?token=` from the history page. Without it there is
 * nothing to check against, so the page says so rather than failing on submit.
 */
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft, Pill as PillIcon, Search, Stethoscope } from "lucide-react";

import { ExistingInteractions, InteractionAlert } from "@/components/interaction-alert";
import { MedicationList } from "@/components/care-events";
import { PageShell } from "@/components/site-nav";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Eyebrow,
  Field,
  Pill,
  Reveal,
  Skeleton,
} from "@/components/ui";
import {
  ApiClientError,
  postJson,
  type InteractionCheckResponse,
} from "@/lib/contracts";

/** Quick picks for the live demo — the first one is the deliberate collision. */
const SUGGESTIONS = ["Ibuprofen", "Paracetamol", "Metronidazole", "Ciprofloxacin", "Amoxicillin"];

function PrescribeForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [drug, setDrug] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [result, setResult] = useState<InteractionCheckResponse | null>(null);

  async function check(value: string) {
    const name = value.trim();
    if (!name || !token) return;

    setPending(true);
    setError(null);
    try {
      setResult(
        await postJson<InteractionCheckResponse>("/api/interactions/check", {
          grantToken: token,
          newDrug: name,
        }),
      );
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? { code: err.code, message: err.message }
          : { code: "UNKNOWN", message: "Could not run the interaction check." },
      );
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <Card>
        <EmptyState icon={Stethoscope} title="No referral open">
          Open a referral first — the interaction check needs the patient&apos;s
          medication list to check against.
        </EmptyState>
        <div className="flex justify-center pb-8">
          <Link href="/doctor" className="btn btn-primary">
            <ArrowLeft size={16} aria-hidden />
            Open a referral
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Reveal>
        <Link
          href={`/doctor?token=${encodeURIComponent(token)}`}
          className="mb-6 inline-flex items-center gap-1.5 text-[0.875rem] text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} aria-hidden />
          Back to history
        </Link>

        <Eyebrow className="mb-3.5">Doctor · prescribing check</Eyebrow>
        <h1 className="text-[2.25rem] leading-[1.1] sm:text-[2.75rem]">
          Before you prescribe,
          <span className="headline-mute"> check the list.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-2">
          The new drug is resolved to a clinical concept, then checked against
          every medication already on this patient&apos;s twin.
        </p>
      </Reveal>

      <Reveal delay={80}>
        <Card className="mt-10 p-6 sm:p-7">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void check(drug);
            }}
          >
            <Field
              label="New medication"
              htmlFor="drug"
              hint="Generic or brand name. Dose is fine to include."
            >
              <div className="flex gap-2">
                <input
                  id="drug"
                  className="input"
                  placeholder="Ibuprofen 400mg"
                  value={drug}
                  onChange={(e) => setDrug(e.target.value)}
                  autoComplete="off"
                />
                <Button type="submit" pending={pending} disabled={!drug.trim()} icon={Search}>
                  Check
                </Button>
              </div>
            </Field>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[0.8125rem] text-ink-3">Try:</span>
            {SUGGESTIONS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setDrug(name);
                  void check(name);
                }}
                className="pill transition-colors hover:border-ink-3 hover:text-ink"
              >
                {name}
              </button>
            ))}
          </div>
        </Card>
      </Reveal>

      {error ? (
        <div className="mt-6">
          <ErrorNote code={error.code} message={error.message} />
        </div>
      ) : null}

      {pending && !result ? (
        <div className="mt-6 space-y-3" aria-hidden>
          <Skeleton className="h-28 w-full" />
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 space-y-6">
          <InteractionAlert result={result} />

          <ExistingInteractions pairs={result.otherInteractions} />

          <Card className="p-6 sm:p-7">
            <h2 className="mb-5 flex items-center gap-2.5 text-[1.25rem]">
              <PillIcon size={18} className="text-ink-3" aria-hidden />
              Checked against
              <Pill className="ml-1">{result.existingMeds.length}</Pill>
            </h2>
            <MedicationList medications={result.existingMeds} />

            {result.checkedConceptIds?.length ? (
              <p className="mt-5 break-all font-mono text-[0.6875rem] leading-relaxed text-ink-3">
                concept ids: [{result.checkedConceptIds.join(", ")}]
              </p>
            ) : null}
          </Card>
        </div>
      ) : null}
    </>
  );
}

export default function PrescribePage() {
  return (
    <PageShell width="narrow">
      <Suspense
        fallback={
          <div className="space-y-4" aria-hidden>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-28 w-full" />
          </div>
        }
      >
        <PrescribeForm />
      </Suspense>
    </PageShell>
  );
}
