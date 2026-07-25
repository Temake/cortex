/**
 * /student/[twinId] — the student's plain-language view of their last visit.
 *
 * Posts to /api/summary. The explanation is templated from HOLON-resolved
 * concept names rather than generated: AI narration is a real-twin feature and
 * the sandbox host returns null for it, so there is nothing to narrate with.
 *
 * Tone is deliberately second-person and jargon-light — this is the one screen a
 * patient reads, so the clinical codes sit in a separate "what was recorded"
 * panel rather than in the prose.
 */
"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Activity, CircleCheck, FileText, MapPin, RotateCcw } from "lucide-react";

import { PageShell } from "@/components/site-nav";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Eyebrow,
  Pill,
  Reveal,
  Skeleton,
} from "@/components/ui";
import {
  ApiClientError,
  formatDate,
  postJson,
  relativeTime,
  type SummaryResponse,
} from "@/lib/contracts";

export default function StudentSummaryPage() {
  const params = useParams<{ twinId: string }>();
  const twinId = params?.twinId ?? "";

  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // No token: the route falls back to the single sandbox twin, which is what
      // this page is for. twinId is carried in the URL for the demo's sake.
      setData(await postJson<SummaryResponse>("/api/summary", { twinId }));
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? { code: err.code, message: err.message }
          : { code: "UNKNOWN", message: "Could not load your summary." },
      );
    } finally {
      setLoading(false);
    }
  }, [twinId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell width="narrow">
      <Reveal>
        <Eyebrow className="mb-3.5">Student · your record</Eyebrow>
        <h1 className="text-[2.25rem] leading-[1.1] sm:text-[2.75rem]">
          Your last visit,
          <span className="headline-mute"> in plain language.</span>
        </h1>
      </Reveal>

      {loading ? (
        <div className="mt-10 space-y-4" aria-hidden>
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error ? (
        <div className="mt-10 space-y-4">
          <ErrorNote code={error.code} message={error.message} />
          <Button variant="secondary" onClick={() => void load()} icon={RotateCcw}>
            Try again
          </Button>
        </div>
      ) : !data?.visitId ? (
        <Card className="mt-10">
          <EmptyState icon={FileText} title="No visit recorded yet">
            {data?.summary ??
              "Once a nurse logs a visit at the Health Centre, your summary will appear here."}
          </EmptyState>
        </Card>
      ) : (
        <div className="mt-10 space-y-6">
          {/* Visit meta */}
          <Reveal>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="ok" icon={CircleCheck}>
                Visit recorded
              </Pill>
              <Pill>{formatDate(data.occurredAt)}</Pill>
              <span className="text-[0.8125rem] text-ink-3">{relativeTime(data.occurredAt)}</span>
              {data.hostel ? <Pill icon={MapPin}>{data.hostel}</Pill> : null}
            </div>
          </Reveal>

          {/* The explanation */}
          <Reveal delay={80}>
            <Card className="p-6 sm:p-8">
              <ul className="list-none space-y-4 p-0">
                {data.lines.map((line, i) => (
                  <li key={i} className="flex gap-3.5">
                    <span
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-3"
                      aria-hidden
                    />
                    <p className="text-[1.0625rem] leading-relaxed text-ink">{line}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>

          {/* What was recorded, with the clinical codes kept separate */}
          {data.items.length ? (
            <Reveal delay={140}>
              <Card className="overflow-hidden">
                <div className="flex items-center gap-2.5 border-b border-line bg-canvas-soft px-5 py-4">
                  <Activity size={15} className="text-ink-3" aria-hidden />
                  <p className="text-[0.9375rem] font-medium">What was recorded</p>
                </div>

                <ul className="list-none divide-y divide-line-soft p-0">
                  {data.items.map((item, i) => (
                    <li key={`${item.code}-${i}`} className="px-5 py-4">
                      <p className="mb-1.5 font-mono text-[0.625rem] uppercase tracking-widest text-ink-3">
                        {item.label}
                      </p>
                      <p className="text-[0.9375rem] leading-relaxed text-ink">{item.value}</p>
                      {item.conceptName ? (
                        <div className="mt-2.5">
                          <Pill tone="info" mono>
                            {item.conceptName}
                            {item.vocabularyId ? ` · ${item.vocabularyId}` : ""}
                          </Pill>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          ) : null}

          <Reveal delay={190}>
            <p className="px-1 text-[0.8125rem] leading-relaxed text-ink-3">
              Resolved through the HOLON clinical knowledge API
              {data.knowledgeSource === "fallback"
                ? " — currently unreachable, so concept names came from an offline reference table."
                : "."}{" "}
              This is your record; you control who sees it.
            </p>
          </Reveal>
        </div>
      )}
    </PageShell>
  );
}
