'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

interface ReferralResponse {
  ok: boolean;
  referralId?: string;
  grantToken?: string;
  link?: string;
  expiresAt?: string;
  expiresInHours?: number;
  scope?: any;
  visit?: any;
  error?: { code: string; message: string };
}

export default function ReferPage() {
  const params = useParams();
  const visitId = params?.visitId as string;

  const [reason, setReason] = useState('');
  const [ttlHours, setTtlHours] = useState('48');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReferralResponse | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const generateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/refer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId, reason, ttlHours: Number(ttlHours) }),
      });
      const data: ReferralResponse = await res.json();
      if (data.ok) {
        setResult(data);
      } else {
        setError(data.error?.message || 'Failed to generate referral');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (result?.link) {
      navigator.clipboard.writeText(result.link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const copyToken = () => {
    if (result?.grantToken) {
      navigator.clipboard.writeText(result.grantToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        <div className="text-sm text-[var(--color-ink-secondary)]">
          Cortex &gt; Refer to OAUTHC
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-6 space-y-8">
        {!result ? (
          <div className="card p-6">
            <h1 className="font-display text-2xl mb-6">Generate Referral</h1>
            {error && (
              <div className="mb-4 p-4 border border-[var(--color-border)] bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}
            <form onSubmit={generateReferral} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--color-ink-secondary)]">
                  REASON FOR REFERRAL
                </label>
                <textarea
                  className="input w-full min-h-[100px]"
                  placeholder="e.g. Persistent fever, needs specialist review"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--color-ink-secondary)]">
                  REFERRAL VALIDITY
                </label>
                <select
                  className="input w-full"
                  value={ttlHours}
                  onChange={(e) => setTtlHours(e.target.value)}
                >
                  <option value="24">24h</option>
                  <option value="48">48h (default)</option>
                  <option value="72">72h</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate referral'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="font-display text-3xl">Referral issued</h2>
            
            <div className="card p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-[var(--color-ink-secondary)] mb-1">REFERRAL ID</div>
                  <div className="font-mono text-[var(--color-ink)]">
                    {result.referralId?.substring(0, 8)}...
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-[var(--color-ink-secondary)] mb-1">EXPIRES AT</div>
                  <div className="text-[var(--color-ink)]">
                    {result.expiresAt ? formatDate(result.expiresAt) : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-8 border border-[var(--color-border)] rounded-lg bg-white space-y-6">
                <QRCodeSVG value={result.link || ''} size={200} />
                
                <div className="flex flex-col items-center w-full max-w-sm space-y-2">
                  <button
                    onClick={copyLink}
                    className="flex items-center justify-between w-full p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <span className="truncate text-sm text-[var(--color-ink-secondary)] mr-2">
                      {result.link}
                    </span>
                    <span className="text-sm font-medium shrink-0 text-[var(--color-ink)]">
                      {copiedLink ? 'Copied!' : 'Copy'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-[var(--color-ink-secondary)]">GRANT TOKEN</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-gray-50 border border-[var(--color-border)] rounded-md font-mono text-xs overflow-x-auto">
                    {result.grantToken}
                  </div>
                  <button
                    onClick={copyToken}
                    className="btn btn-ghost shrink-0"
                  >
                    {copiedToken ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <p className="text-sm text-[var(--color-ink-muted)]">
                The doctor scans this QR code or pastes the token to access the patient's scoped history.
              </p>
            </div>
            
            <div className="flex justify-start">
              <button onClick={() => window.location.href='/'} className="btn btn-ghost">
                ← Back to dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
