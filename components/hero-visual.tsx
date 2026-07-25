/**
 * The landing hero's right-hand visual.
 *
 * Shows what Cortex actually does: one patient record crossing from the Health
 * Centre to OAUTHC, with the interaction check firing on arrival. Everything is
 * in normal flow — no floating badges pinned around the card.
 *
 * Deliberately drawn in markup rather than shipped as an image — it stays sharp
 * at any density, themes off the same tokens, and needs no binary asset.
 */
"use client";

import { ArrowRight, Building2, Pill, ShieldCheck, TriangleAlert } from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]" aria-hidden>
      {/* soft ambient wash behind the composition */}
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[999px] bg-[radial-gradient(closest-side,rgba(67,56,202,0.09),transparent)]" />

      {/* ── the journey: Health Centre -> OAUTHC ───────────────────── */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 py-2.5 shadow-xs">
          <span className="flex size-6 items-center justify-center rounded-full bg-raised text-ink">
            <Building2 size={13} />
          </span>
          <span className="truncate text-[0.8125rem] font-medium text-ink">Jaja Health Centre</span>
        </div>

        <ArrowRight size={16} className="shrink-0 text-ink-3" />

        <div className="flex flex-1 items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 py-2.5 shadow-xs">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent text-white">
            <Building2 size={13} />
          </span>
          <span className="truncate text-[0.8125rem] font-medium text-ink">OAUTHC</span>
        </div>
      </div>

      {/* ── the record card ───────────────────────────────────────── */}
      <div className="card relative overflow-hidden p-6 shadow-lg">
        {/* a slow scan sweep, to suggest "resolving continuously" */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow mb-1.5">Twin · scoped referral</p>
            <p className="font-display text-[1.375rem] font-semibold tracking-tight">
              Visit summary
            </p>
          </div>
          <span className="pill pill-ok">
            <span className="dot dot-ok dot-live" />
            Consented
          </span>
        </div>

        {/* vitals row */}
        <div className="mb-5 grid grid-cols-3 gap-2.5">
          {[
            { label: "Temp", value: "38.9", unit: "°C", tone: "warn" as const },
            { label: "BP", value: "118/76", unit: "", tone: "ok" as const },
            { label: "HR", value: "96", unit: "bpm", tone: "ok" as const },
          ].map((v) => (
            <div key={v.label} className="rounded-xl border border-line bg-canvas-soft p-3">
              <p className="mb-1 font-mono text-[0.625rem] uppercase tracking-widest text-ink-3">
                {v.label}
              </p>
              <p className="font-display text-[1.0625rem] font-semibold leading-none text-ink">
                {v.value}
                {v.unit ? (
                  <span className="ml-0.5 text-[0.6875rem] font-normal text-ink-3">{v.unit}</span>
                ) : null}
              </p>
            </div>
          ))}
        </div>

        {/* Medication rows — the real demo pair, verified in HOLON's table. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
            <span className="flex items-center gap-2.5 text-[0.875rem] text-ink">
              <Pill size={14} className="text-ink-3" />
              Amitriptyline 25mg
            </span>
            <span className="pill pill-mono">DrugBank</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-danger-line bg-danger-soft px-3.5 py-2.5">
            <span className="flex items-center gap-2.5 text-[0.875rem] font-medium text-danger">
              <TriangleAlert size={14} />
              Tramadol — new
            </span>
            <span className="pill pill-danger">Major</span>
          </div>
        </div>
      </div>

      {/* The scope line, in-flow under the card rather than floating beside it. */}
      <div className="mt-4 flex items-center justify-center gap-2 text-[0.8125rem] text-ink-2">
        <ShieldCheck size={14} className="shrink-0 text-ok" />
        Scoped to this visit · expires in 48 hours
      </div>
    </div>
  );
}
