'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--color-ink)]">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16.8" cy="7.2" r="3.5" fill="currentColor"/>
            <circle cx="16.8" cy="16.7" r="3.5" fill="currentColor"/>
            <circle cx="7.3" cy="7.2" r="3.5" fill="currentColor"/>
            <circle cx="7.3" cy="16.7" r="3.5" fill="currentColor"/>
            <circle cx="2.7" cy="10.4" r="1.2" fill="currentColor"/>
            <circle cx="21.3" cy="10.4" r="1.2" fill="currentColor"/>
            <circle cx="2.7" cy="13.7" r="1.2" fill="currentColor"/>
            <circle cx="21.3" cy="13.7" r="1.2" fill="currentColor"/>
            <circle cx="13.6" cy="2.7" r="1.2" fill="currentColor"/>
            <circle cx="10.3" cy="2.7" r="1.2" fill="currentColor"/>
            <circle cx="13.6" cy="21.4" r="1.2" fill="currentColor"/>
            <circle cx="10.3" cy="21.4" r="1.2" fill="currentColor"/>
          </svg>
          Cortex
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center px-6 pt-24 pb-32">
        <div className="w-full max-w-5xl">
          <header className="mb-20 max-w-3xl">
            <div className="text-[var(--color-ink-muted)] text-sm font-semibold tracking-widest uppercase mb-4">
              CORTEX · CAREBRIDGE OAU
            </div>
            <h1 className="font-display text-5xl sm:text-6xl text-[var(--color-ink)] leading-[1.1] tracking-tight mb-6 whitespace-pre-line">
              {'Referral continuity,\nbetween campus and hospital.'}
            </h1>
            <p className="text-xl text-[var(--color-ink-secondary)] leading-relaxed max-w-2xl">
              Built on Ontomorph digital twins — every visit, medication, and vital sign travels with the patient.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* NURSE */}
            <Link href="/intake" className="card p-8 group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="font-display text-3xl text-[var(--color-ink-muted)] mb-6 opacity-50 transition-opacity group-hover:opacity-100">01</div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-ink)]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--color-ink)]">Log an intake</h2>
                </div>
                <p className="text-[var(--color-ink-secondary)] leading-relaxed">
                  Record a visit at the OAU Health Centre — complaint, vitals, medications given.
                </p>
              </div>
            </Link>

            {/* DOCTOR */}
            <Link href="/doctor" className="card p-8 group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="font-display text-3xl text-[var(--color-ink-muted)] mb-6 opacity-50 transition-opacity group-hover:opacity-100">02</div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-ink)]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"></path><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"></path><circle cx="20" cy="10" r="2"></circle></svg>
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--color-ink)]">Open a referral</h2>
                </div>
                <p className="text-[var(--color-ink-secondary)] leading-relaxed">
                  Paste the referral token from the Health Centre. View the patient's scoped history and check drug interactions.
                </p>
              </div>
            </Link>

            {/* STUDENT */}
            <Link href="/student/5a4d0000-0000-0000-0000-000000000102" className="card p-8 group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="font-display text-3xl text-[var(--color-ink-muted)] mb-6 opacity-50 transition-opacity group-hover:opacity-100">03</div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-ink)]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--color-ink)]">View your summary</h2>
                </div>
                <p className="text-[var(--color-ink-secondary)] leading-relaxed">
                  See a plain-language explanation of your last visit at the Health Centre.
                </p>
              </div>
            </Link>

            {/* CLUSTERS */}
            <Link href="/clusters" className="card p-8 group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="flex items-start justify-between mb-6">
                  <div className="font-display text-3xl text-[var(--color-ink-muted)] opacity-50 transition-opacity group-hover:opacity-100">04</div>
                  <span className="pill pill-ok">Preview</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-ink)]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--color-ink)]">Campus clusters</h2>
                </div>
                <p className="text-[var(--color-ink-secondary)] leading-relaxed">
                  Preview — mocked outbreak data across hostels. Phase 2 feature.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-[var(--color-ink-muted)] border-t border-[var(--color-border)]">
        Powered by Ontomorph DTP &amp; HOLON · Hackathon prototype
      </footer>
    </div>
  );
}
