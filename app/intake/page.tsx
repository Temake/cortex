'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function NurseIntakePage() {
  const [complaint, setComplaint] = useState('');
  const [vitals, setVitals] = useState({ temp: '', bp: '', hr: '', rr: '', spo2: '' });
  const [medsGiven, setMedsGiven] = useState('');
  const [hostel, setHostel] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const meds = medsGiven.split('\n').map(m => m.trim()).filter(Boolean);
    const vitalsPayload: any = {};
    if (vitals.temp) vitalsPayload.temp = Number(vitals.temp);
    if (vitals.bp) vitalsPayload.bp = vitals.bp;
    if (vitals.hr) vitalsPayload.hr = Number(vitals.hr);
    if (vitals.rr) vitalsPayload.rr = Number(vitals.rr);
    if (vitals.spo2) vitalsPayload.spo2 = Number(vitals.spo2);

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint,
          vitals: vitalsPayload,
          medsGiven: meds,
          ...(hostel ? { hostel } : {})
        })
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error?.message || 'Failed to record intake');
      } else {
        setSuccessData(data);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setComplaint('');
    setVitals({ temp: '', bp: '', hr: '', rr: '', spo2: '' });
    setMedsGiven('');
    setHostel('');
    setSuccessData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--color-ink)] hover:opacity-80">
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
          <span className="text-[var(--color-ink-muted)]">/</span>
          <span className="text-[var(--color-ink-secondary)]">Nurse Intake</span>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-8 max-w-3xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold text-[var(--color-ink)] mb-2">Log a visit</h1>
          <p className="text-[var(--color-ink-secondary)]">
            Record the patient's presenting complaint, vital signs, and any medications given at the OAU Health Centre.
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="card space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-1 text-sm font-medium text-[var(--color-ink)]" htmlFor="complaint">COMPLAINT <span className="text-red-500">*</span></label>
              <textarea
                id="complaint"
                required
                className="input w-full min-h-[100px]"
                placeholder="e.g. Fever and headache for 3 days"
                value={complaint}
                onChange={e => setComplaint(e.target.value)}
                disabled={!!successData || isLoading}
              />
            </div>

            <div>
              <h3 className="block mb-3 text-sm font-medium text-[var(--color-ink)]">VITALS</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1 text-xs text-[var(--color-ink-secondary)]" htmlFor="temp">Temperature (°C)</label>
                  <input
                    id="temp"
                    type="number"
                    step="0.1"
                    className="input w-full"
                    placeholder="37.0"
                    value={vitals.temp}
                    onChange={e => setVitals({...vitals, temp: e.target.value})}
                    disabled={!!successData || isLoading}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs text-[var(--color-ink-secondary)]" htmlFor="bp">Blood Pressure</label>
                  <input
                    id="bp"
                    type="text"
                    className="input w-full"
                    placeholder="120/80"
                    value={vitals.bp}
                    onChange={e => setVitals({...vitals, bp: e.target.value})}
                    disabled={!!successData || isLoading}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs text-[var(--color-ink-secondary)]" htmlFor="hr">Heart Rate (bpm)</label>
                  <input
                    id="hr"
                    type="number"
                    className="input w-full"
                    placeholder="72"
                    value={vitals.hr}
                    onChange={e => setVitals({...vitals, hr: e.target.value})}
                    disabled={!!successData || isLoading}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs text-[var(--color-ink-secondary)]" htmlFor="rr">Resp. Rate (/min)</label>
                  <input
                    id="rr"
                    type="number"
                    className="input w-full"
                    placeholder="16"
                    value={vitals.rr}
                    onChange={e => setVitals({...vitals, rr: e.target.value})}
                    disabled={!!successData || isLoading}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs text-[var(--color-ink-secondary)]" htmlFor="spo2">SpO₂ (%)</label>
                  <input
                    id="spo2"
                    type="number"
                    className="input w-full"
                    placeholder="98"
                    value={vitals.spo2}
                    onChange={e => setVitals({...vitals, spo2: e.target.value})}
                    disabled={!!successData || isLoading}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-[var(--color-ink)]" htmlFor="meds">MEDICATIONS GIVEN</label>
              <textarea
                id="meds"
                className="input w-full min-h-[80px]"
                placeholder={`One per line, e.g.\nParacetamol 1g\nAmoxicillin 500mg`}
                value={medsGiven}
                onChange={e => setMedsGiven(e.target.value)}
                disabled={!!successData || isLoading}
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-[var(--color-ink)]" htmlFor="hostel">HOSTEL</label>
              <select
                id="hostel"
                className="input w-full"
                value={hostel}
                onChange={e => setHostel(e.target.value)}
                disabled={!!successData || isLoading}
              >
                <option value=""></option>
                <option value="Angola">Angola</option>
                <option value="Awo">Awo</option>
                <option value="Mozambique">Mozambique</option>
                <option value="Alumni">Alumni</option>
                <option value="Off-campus">Off-campus</option>
              </select>
            </div>

            {!successData && (
              <button
                type="submit"
                className="btn btn-primary w-full py-3 flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? 'Recording...' : 'Record intake'}
              </button>
            )}
          </form>
        </div>

        {successData && (
          <div className="mt-8 card bg-[#F0FDF4] border-[#BBF7D0]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-green-900">Visit recorded</h2>
            </div>
            
            <div className="grid gap-2 text-sm text-[var(--color-ink-secondary)] mb-6">
              <div className="flex gap-2">
                <span className="font-medium text-[var(--color-ink)]">Visit ID:</span> {successData.visitId}
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-[var(--color-ink)]">Twin ID:</span> {successData.twinId}
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-[var(--color-ink)]">Events logged:</span> {successData.eventCount}
              </div>
              
              {successData.knowledgeSource && (
                <div className="mt-2">
                  <span className="pill pill-ok">Source: {successData.knowledgeSource}</span>
                </div>
              )}
            </div>

            {successData.events && successData.events.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider mb-2">Events</h4>
                <div className="bg-white border border-[var(--color-border)] rounded-md overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#FBFDFE] border-b border-[var(--color-border)]">
                      <tr>
                        <th className="px-4 py-2 text-xs text-[var(--color-ink-secondary)] font-medium">Code</th>
                        <th className="px-4 py-2 text-xs text-[var(--color-ink-secondary)] font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {successData.events.map((ev: any, i: number) => (
                        <tr key={i}>
                          <td className="px-4 py-2 font-mono text-xs text-[var(--color-ink)]">{ev.code}</td>
                          <td className="px-4 py-2 text-[var(--color-ink)]">{ev.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link href={`/intake/${successData.visitId}/refer`} className="btn btn-primary justify-center">
                Refer to OAUTHC &rarr;
              </Link>
              <button onClick={resetForm} type="button" className="btn btn-ghost justify-center">
                Log another visit
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
