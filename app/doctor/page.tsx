'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CareEvent {
  id: string;
  eventType: string;
  system: string;
  code?: string;
  value?: string;
  unit?: string;
  title?: string;
  description?: string;
  occurredAt: string;
  recordedAt?: string;
  visitId?: string;
  hostel?: string;
  conceptId?: string;
  conceptName?: string;
  vocabularyId?: string;
  vitals?: any;
  fromCareBridge?: boolean;
}

interface HistoryResponse {
  ok: boolean;
  twinId?: string;
  tokenKind?: string;
  scope?: any;
  referral?: {
    referralId: string;
    visitId: string;
    reason: string;
    issuedAt: string;
    expiresAt: string;
  } | null;
  events?: CareEvent[];
  eventCount?: number;
  systems?: { system: string; eventCount: number }[];
  medications?: { eventId: string; name: string; conceptId?: string; conceptName?: string; occurredAt: string }[];
  visits?: any[];
  error?: { code: string; message: string };
}

export default function DoctorPortalPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{code: string, message: string} | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);

  const fetchHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/doctor/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantToken: token.trim() }),
      });
      const data: HistoryResponse = await res.json();
      if (data.ok) {
        setHistory(data);
      } else {
        setError(data.error || { code: 'UNKNOWN_ERROR', message: 'Failed to fetch history' });
      }
    } catch (err: any) {
      setError({ code: 'NETWORK_ERROR', message: err.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (eventType: string) => {
    if (eventType === 'vital_sign' || eventType === 'medication') return 'status-dot-ok';
    if (eventType === 'diagnosis') return 'status-dot-info bg-blue-500';
    return 'status-dot-warn';
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
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
      </nav>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        <h1 className="font-display text-3xl">Open a referral</h1>

        {!history ? (
          <div className="card p-6">
            {error && (
              <div className="mb-6 p-4 border border-[var(--color-border)] bg-red-50 text-red-700 rounded-md">
                <div className="font-semibold text-sm">{error.code}</div>
                <div>{error.message}</div>
              </div>
            )}
            
            <form onSubmit={fetchHistory} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--color-ink-secondary)]">
                  REFERRAL TOKEN OR LINK
                </label>
                <textarea
                  className="input w-full min-h-[120px] font-mono text-sm"
                  placeholder="Paste the grant token here..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !token.trim()}
              >
                {loading ? 'Verifying...' : 'View patient history'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-2xl">Patient Portal</h2>
              <button onClick={() => { setHistory(null); setToken(''); }} className="btn btn-ghost text-sm">
                Clear token
              </button>
            </div>

            {history.referral && (
              <div className="card p-6 space-y-4 border-l-4 border-l-[var(--color-ink)]">
                <h3 className="font-semibold text-lg">REFERRAL INFO</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-[var(--color-ink-secondary)]">REASON</div>
                    <div className="mt-1">{history.referral.reason || 'No reason provided'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--color-ink-secondary)]">VALIDITY</div>
                    <div className="mt-1 text-sm">
                      Issued: {formatDate(history.referral.issuedAt)}<br/>
                      Expires: {formatDate(history.referral.expiresAt)}
                    </div>
                  </div>
                </div>
                {history.scope && (
                  <div className="pt-4 border-t border-[var(--color-border)]">
                    <div className="text-sm font-medium text-[var(--color-ink-secondary)] mb-2">SCOPE GRANTED</div>
                    <div className="flex flex-wrap gap-2">
                      {history.scope.systems?.map((sys: string) => (
                        <span key={sys} className="pill pill-ok">System: {sys}</span>
                      ))}
                      {history.scope.eventTypes?.map((et: string) => (
                        <span key={et} className="pill pill-info bg-blue-100 text-blue-800">Type: {et}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg flex items-center gap-3">
                  Health events
                  <span className="pill pill-ok">{history.eventCount || 0}</span>
                </h3>
              </div>

              <div className="space-y-4">
                {history.events && history.events.length > 0 ? (
                  history.events.map((event) => (
                    <div key={event.id} className="flex items-start gap-4 p-4 border border-[var(--color-border)] rounded-md hover:bg-gray-50 transition-colors">
                      <div className="mt-1">
                        <span className={`status-dot ${getStatusColor(event.eventType)}`} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-[var(--color-ink)]">
                            {event.title || event.code || event.eventType}
                          </div>
                          <div className="text-sm text-[var(--color-ink-secondary)]">
                            {formatDate(event.occurredAt)}
                          </div>
                        </div>
                        
                        {(event.value || event.description) && (
                          <div className="text-sm text-[var(--color-ink-secondary)]">
                            {event.value} {event.unit} {event.description ? `- ${event.description}` : ''}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {event.system && (
                            <span className="pill pill-ok">{event.system}</span>
                          )}
                          <span className="pill bg-gray-100 text-gray-800">{event.eventType}</span>
                          {event.fromCareBridge && (
                            <span className="pill bg-purple-100 text-purple-800 text-xs">CareBridge</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[var(--color-ink-muted)]">
                    No health events found in scoped history.
                  </div>
                )}
              </div>
            </div>

            {history.medications && history.medications.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold text-lg mb-4">MEDICATIONS</h3>
                <div className="space-y-3">
                  {history.medications.map((med, i) => (
                    <div key={med.eventId || i} className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded-md">
                      <div>
                        <div className="font-medium">{med.name}</div>
                        {med.conceptName && med.conceptName !== med.name && (
                          <div className="text-sm text-[var(--color-ink-secondary)]">{med.conceptName}</div>
                        )}
                      </div>
                      <div className="text-sm text-[var(--color-ink-secondary)]">
                        {formatDate(med.occurredAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Link 
                href={`/doctor/${history.referral?.referralId || 'direct'}/prescribe?token=${encodeURIComponent(token)}`}
                className="btn btn-primary"
              >
                Check a new prescription →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
