'use client';

import { useEffect, useState } from 'react';

export default function StudentVisitPage({ params }: { params: { twinId: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const json = await res.json();
        
        if (!json.ok) {
          throw new Error(json.error?.message || 'Failed to load visit summary');
        }
        
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSummary();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <a href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--color-ink)]">
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
        </a>
        <div className="text-sm font-medium text-[var(--color-ink-secondary)]">
          Your visit summary
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-3xl mx-auto w-full flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-display font-semibold mb-2 text-[var(--color-ink)]">Your visit summary</h1>
          <p className="text-[var(--color-ink-secondary)]">Here's what happened at the Health Centre, in plain language.</p>
        </div>

        {loading && (
          <div className="flex flex-col gap-6 animate-pulse">
            <div className="card h-64 bg-[var(--color-surface)] rounded-xl"></div>
            <div className="card h-48 bg-[var(--color-surface)] rounded-xl"></div>
          </div>
        )}

        {error && (
          <div className="card bg-red-50 text-red-900 border-red-200">
            <h3 className="font-semibold text-lg mb-2">Unable to load summary</h3>
            <p>{error}</p>
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="card">
              <p className="text-lg leading-relaxed text-[var(--color-ink)] mb-6">
                {data.summary}
              </p>
              
              {data.lines && data.lines.length > 0 && (
                <>
                  <hr className="border-[var(--color-border)] my-6" />
                  <ul className="space-y-3 list-disc pl-5 text-[var(--color-ink)]">
                    {data.lines.map((line: string, i: number) => (
                      <li key={i} className="pl-2">{line}</li>
                    ))}
                  </ul>
                </>
              )}
              
              <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
                <span className="inline-block px-3 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full text-xs text-[var(--color-ink-muted)]">
                  Source: {data.knowledgeSource || 'OMOP Standardised Record'}
                </span>
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-semibold mb-6 text-[var(--color-ink)]">Visit details</h2>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-[var(--color-border)]">
                  <span className="font-medium text-[var(--color-ink)]">Date</span>
                  <span className="text-[var(--color-ink-secondary)]">
                    {data.occurredAt ? new Date(data.occurredAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-[var(--color-border)]">
                  <span className="font-medium text-[var(--color-ink)]">Hostel</span>
                  <span className="text-[var(--color-ink-secondary)]">{data.hostel || 'N/A'}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-[var(--color-border)]">
                  <span className="font-medium text-[var(--color-ink)]">Recorded Events</span>
                  <span className="text-[var(--color-ink-secondary)]">{data.eventCount || 0}</span>
                </div>

                {data.items && data.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0">
                    <span className="font-medium text-[var(--color-ink)]">{item.label}</span>
                    <div className="flex items-center gap-3 mt-1 sm:mt-0">
                      <span className="text-[var(--color-ink-secondary)]">{item.value}</span>
                      {item.conceptName && (
                        <span className="text-xs bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-1 rounded text-[var(--color-ink-muted)]">
                          {item.conceptName} ({item.vocabularyId})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <p className="text-sm text-center text-[var(--color-ink-muted)] mt-4 mb-8">
              This record travels with you. If you are referred to OAUTHC, the doctor there can access this visit directly.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
