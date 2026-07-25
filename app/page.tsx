/**
 * Landing page and role switcher.
 *
 * Structured like a standard product site rather than a bare menu: hero with a
 * right-hand visual, a three-step "how it works" band, then the role entries.
 * The two-tone headline (dark opening clause, muted continuation) is the
 * signature move of the Ontomorph reference and is used consistently.
 *
 * Client component because the STEPS/ROLES tables hold lucide icon components
 * and pass them as props — a component function cannot cross the server/client
 * boundary. Nearly everything rendered here (Reveal, Card, SiteNav) is already
 * a client component, so this costs no meaningful extra bundle.
 */
"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ClipboardPlus,
  FileText,
  QrCode,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";

import { HeroVisual } from "@/components/hero-visual";
import { SiteFooter, SiteNav } from "@/components/site-nav";
import { ButtonLink, Card, Eyebrow, Pill, Reveal, SectionHeading } from "@/components/ui";

const STEPS = [
  {
    icon: ClipboardPlus,
    title: "Log the visit once",
    body: "A nurse records the complaint, vitals and medications at the Health Centre. Each becomes a health event on the student's digital twin.",
    tags: ["Twin events", "Vitals", "Medications"],
  },
  {
    icon: QrCode,
    title: "Refer with scoped consent",
    body: "Referral to OAUTHC issues a time-boxed, scoped token as a QR code. It carries only the systems the visit touched, and expires on its own.",
    tags: ["Scoped", "48h expiry", "QR handoff"],
  },
  {
    icon: ShieldCheck,
    title: "Prescribe safely",
    body: "The receiving doctor sees the history immediately. Before prescribing, the new drug is checked against the patient's existing medications through HOLON.",
    tags: ["HOLON concepts", "Drug interactions", "RxNorm"],
  },
];

const ROLES = [
  {
    href: "/intake",
    n: "01",
    icon: ClipboardPlus,
    title: "Nurse",
    body: "Log an intake visit at the Health Centre, then raise a referral to OAUTHC.",
  },
  {
    href: "/doctor",
    n: "02",
    icon: Stethoscope,
    title: "Doctor",
    body: "Open a referral token, read the scoped history, and check a new prescription.",
  },
  {
    href: "/student/5a4d0000-0000-0000-0000-000000000102",
    n: "03",
    icon: User,
    title: "Student",
    body: "Read a plain-language explanation of your last visit, resolved through HOLON.",
  },
  {
    href: "/clusters",
    n: "04",
    icon: BarChart3,
    title: "Clusters",
    body: "Phase 2 preview: condition clusters by hostel, from mocked aggregate data.",
    preview: true,
  },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div>
              <Reveal>
                <Eyebrow className="mb-5">CareBridge · OAU health centre → OAUTHC</Eyebrow>
              </Reveal>

              <Reveal delay={70}>
                <h1 className="text-[2.75rem] leading-[1.06] sm:text-[3.5rem] lg:text-[3.75rem]">
                  Referral continuity,
                  <span className="headline-mute"> between campus and hospital.</span>
                </h1>
              </Reveal>

              <Reveal delay={140}>
                <p className="mt-6 max-w-xl text-[1.125rem] leading-relaxed text-ink-2">
                  A student is referred from Jaja to OAUTHC and the record goes with
                  them — every visit, vital sign and medication. No re-asking, no
                  repeated labs, and a drug-interaction check before anything new is
                  prescribed.
                </p>
              </Reveal>

              <Reveal delay={210}>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <ButtonLink href="/intake" size="lg" iconRight={ArrowRight}>
                    Log an intake
                  </ButtonLink>
                  <ButtonLink href="/doctor" variant="secondary" size="lg">
                    Open a referral
                  </ButtonLink>
                </div>
              </Reveal>

              <Reveal delay={280}>
                <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.8125rem] text-ink-3">
                  <span className="flex items-center gap-2">
                    <span className="dot dot-ok dot-live" aria-hidden />
                    Live sandbox twin
                  </span>
                  <span>1.7M drug interactions via HOLON</span>
                  <span>Consent scoped and time-boxed</span>
                </div>
              </Reveal>
            </div>

            <Reveal delay={180} className="lg:pl-4">
              <HeroVisual />
            </Reveal>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────── */}
        <section className="border-t border-line bg-canvas-soft">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <Reveal>
              <SectionHeading
                eyebrow="How it works"
                title="Recorded once."
                muted="Carried everywhere."
                align="center"
              />
            </Reveal>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal key={step.title} delay={i * 90}>
                  <Card className="group h-full p-7">
                    <div className="mb-6 flex items-start justify-between">
                      <span className="numeral">0{i + 1}</span>
                      <span className="flex size-9 items-center justify-center rounded-lg border border-line bg-canvas text-ink">
                        <step.icon size={17} aria-hidden />
                      </span>
                    </div>

                    <h3 className="text-[1.1875rem]">{step.title}</h3>
                    <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-2">
                      {step.body}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-1.5">
                      {step.tags.map((tag) => (
                        <Pill key={tag} mono>
                          {tag}
                        </Pill>
                      ))}
                    </div>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Roles ────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Choose a view"
              title="Four views,"
              muted="one patient journey."
              lead="No login for the demo — step into whichever role you want to see."
            />
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {ROLES.map((role, i) => (
              <Reveal key={role.title} delay={i * 80}>
                <Link href={role.href} className="block h-full">
                  <Card interactive className="group flex h-full flex-col p-7">
                    <div className="mb-6 flex items-start justify-between">
                      <span className="numeral">{role.n}</span>
                      {role.preview ? <Pill tone="warn">Preview</Pill> : null}
                    </div>

                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full border border-line bg-canvas text-ink">
                        <role.icon size={17} aria-hidden />
                      </span>
                      <h3 className="text-[1.1875rem]">{role.title}</h3>
                    </div>

                    <p className="text-[0.9375rem] leading-relaxed text-ink-2">{role.body}</p>

                    <span className="mt-6 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-ink">
                      Open
                      <ArrowRight
                        size={15}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden
                      />
                    </span>
                  </Card>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Platform usage ───────────────────────────────────────── */}
        <section className="border-t border-line bg-slate text-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
              <Reveal>
                <Eyebrow className="mb-4 !text-white/45">Built on the platform</Eyebrow>
                <h2 className="text-[2rem] leading-[1.12] sm:text-[2.5rem]">
                  Twin events, consent, and clinical knowledge.
                  <span className="text-white/45"> All genuinely used.</span>
                </h2>
                <p className="mt-5 max-w-lg text-[1.0625rem] leading-relaxed text-white/65">
                  Nothing here is a mock except the Phase 2 cluster view, which is
                  labelled as such — our sandbox account has a single twin.
                </p>
              </Reveal>

              <Reveal delay={120}>
                <dl className="grid gap-px overflow-hidden rounded-2xl border border-white/12 bg-white/12 sm:grid-cols-2">
                  {[
                    {
                      icon: ClipboardPlus,
                      term: "Twin events",
                      desc: "Vitals, complaints and medications written onto the twin.",
                    },
                    {
                      icon: ShieldCheck,
                      term: "Scoped consent",
                      desc: "Time-boxed referral tokens, scoped to body system and event type.",
                    },
                    {
                      icon: FileText,
                      term: "HOLON concepts",
                      desc: "Free text resolved to RxNorm, SNOMED CT and LOINC concepts.",
                    },
                    {
                      icon: ShieldCheck,
                      term: "Interaction checks",
                      desc: "The full medication list checked before prescribing.",
                    },
                  ].map((item) => (
                    <div key={item.term} className="bg-slate p-6">
                      <item.icon size={17} className="mb-3 text-white/45" aria-hidden />
                      <dt className="font-display text-[1.0625rem] font-medium">{item.term}</dt>
                      <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-white/60">
                        {item.desc}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
