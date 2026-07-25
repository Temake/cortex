/**
 * /clusters — Phase 2 preview.
 *
 * Reads /api/clusters/mock, which serves a local JSON file and makes no
 * Ontomorph call. Our sandbox account has one twin, so live multi-twin
 * aggregation is out of scope; the page is labelled as a preview throughout
 * rather than implying real cohort data.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarRange, Database, RotateCcw } from "lucide-react";

import { ClusterChart } from "@/components/cluster-chart";
import { PageShell } from "@/components/site-nav";
import { Button, Card, ErrorNote, Eyebrow, Pill, Reveal, Skeleton } from "@/components/ui";
import { ApiClientError, formatDate, getJson, type ClustersResponse } from "@/lib/contracts";

export default function ClustersPage() {
  const [data, setData] = useState<ClustersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getJson<ClustersResponse>("/api/clusters/mock"));
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? { code: err.code, message: err.message }
          : { code: "UNKNOWN", message: "Could not load the cluster preview." },
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell>
      <Reveal>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Eyebrow className="mb-3.5">Phase 2 · preview</Eyebrow>
            <h1 className="text-[2.25rem] leading-[1.1] sm:text-[2.75rem]">
              Condition clusters,
              <span className="headline-mute"> by hall of residence.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-2">
              Once intake data exists across many twins, the same events that make
              one referral work also show where something is spreading.
            </p>
          </div>
          <Pill tone="warn" icon={Database}>
            Mocked data
          </Pill>
        </div>
      </Reveal>

      {loading ? (
        <div className="mt-10 space-y-4" aria-hidden>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : error ? (
        <div className="mt-10 space-y-4">
          <ErrorNote code={error.code} message={error.message} />
          <Button variant="secondary" onClick={() => void load()} icon={RotateCcw}>
            Try again
          </Button>
        </div>
      ) : data ? (
        <>
          <Reveal delay={70}>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.875rem] text-ink-2">
              <span className="flex items-center gap-2">
                <CalendarRange size={15} className="text-ink-3" aria-hidden />
                {formatDate(data.dateRange.from)} — {formatDate(data.dateRange.to)}
              </span>
              <span>{data.total} recorded presentations</span>
              <span>
                {data.conditions.length} conditions · {data.hostels.length} halls
              </span>
            </div>
          </Reveal>

          <Reveal delay={120} className="mt-8 block">
            <ClusterChart data={data} />
          </Reveal>

          <Reveal delay={180}>
            <Card className="mt-8 p-6 sm:p-7">
              <h2 className="text-[1.25rem]">What makes this real in Phase 2</h2>
              <p className="mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-2">
                Every intake already tags a hall of residence and resolves the
                complaint to a clinical concept. With more than one twin in the
                account, this view is the same query run across a cohort instead of
                a JSON file — no new data model, no new consent story, since
                aggregate counts need no per-patient grant.
              </p>
            </Card>
          </Reveal>
        </>
      ) : null}
    </PageShell>
  );
}
