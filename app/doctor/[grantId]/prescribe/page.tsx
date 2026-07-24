'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function PrescribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [drugName, setDrugName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const checkInteraction = async () => {
    if (!token) return;
    if (!drugName.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/interactions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantToken: token, newDrug: drugName.trim() })
      });
      const data = await res.json();
      
      if (!data.ok) {
        throw new Error(data.error?.message || 'Failed to check interaction');
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkInteraction();
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
        <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
          <div className="card text-center text-[var(--color-ink-muted)]">
            Error: No access token provided. Please return to the patient page.
          </div>
        </div>
      </div>
    );
  }

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
          Check prescription
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-display font-semibold mb-2 text-[var(--color-ink)]">Check a prescription</h1>
          <p className="text-[var(--color-ink-secondary)]">Enter the drug you are considering prescribing. Cortex will check it against the patient's existing medications.</p>
        </div>

        {!result ? (
          <div className="card flex flex-col gap-4">
            <label className="text-sm font-medium text-[var(--color-ink-secondary)] tracking-wide">NEW DRUG NAME</label>
            <div className="flex gap-4">
              <input 
                type="text" 
                className="input flex-1" 
                placeholder="e.g. Ibuprofen" 
                value={drugName}
                onChange={(e) => setDrugName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button 
                className="btn btn-primary min-w-[150px]" 
                onClick={checkInteraction}
                disabled={loading || !drugName.trim()}
              >
                {loading ? 'Checking...' : 'Check interactions'}
              </button>
            </div>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* The dramatic alert */}
            {(() => {
              if (result.resolvedNewDrug === false) {
                return (
                  <div className="interaction-alert bg-yellow-50 border border-yellow-200 p-6 rounded-lg text-yellow-900 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">❓</span>
                      <h2 className="text-xl font-semibold">Drug not recognized</h2>
                    </div>
                    <p>{result.description}</p>
                  </div>
                );
              }
              
              if (result.hasInteraction === false) {
                return (
                  <div className="interaction-alert interaction-alert-safe bg-green-50 border border-green-200 p-6 rounded-lg text-green-900 shadow-sm flex items-start gap-4">
                    <span className="text-3xl">✅</span>
                    <div>
                      <h2 className="text-2xl font-bold mb-1">No interaction detected</h2>
                      <p className="text-lg">{result.description}</p>
                    </div>
                  </div>
                );
              }

              // hasInteraction === true
              const isMajor = result.severity === 'MAJOR' || result.severity === 'HIGH';
              const alertClass = isMajor 
                ? 'interaction-alert interaction-alert-major bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-500 shadow-xl'
                : 'interaction-alert interaction-alert-moderate bg-yellow-50 border-2 border-yellow-400 shadow-md';
                
              const icon = isMajor ? '❌' : '⚠️';
              const badgeClass = isMajor ? 'bg-red-600 text-white' : 'bg-yellow-500 text-yellow-950';
              
              const pulseAnimation = isMajor ? 'animate-pulse' : '';
              
              return (
                <div className={`${alertClass} p-8 rounded-xl relative overflow-hidden`}>
                  {isMajor && <div className="absolute inset-0 border-4 border-red-500 opacity-50 animate-ping rounded-xl pointer-events-none" style={{ animationDuration: '3s' }}></div>}
                  
                  <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <span className="text-5xl">{icon}</span>
                        <div className={`px-4 py-1 rounded-full text-sm font-bold tracking-wider uppercase ${badgeClass} ${pulseAnimation}`}>
                          {result.severity} INTERACTION
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">
                        {result.interaction?.conceptName || result.newDrug?.conceptName} + {result.existingMeds?.[0]?.conceptName || 'Existing Medication'}
                      </h2>
                      <p className="text-xl text-gray-800 leading-relaxed">{result.description}</p>
                    </div>
                    
                    {result.interaction && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-gray-800">
                        {result.interaction.mechanism && (
                          <div className="bg-white/60 p-4 rounded-lg">
                            <h3 className="text-sm font-bold uppercase text-gray-500 mb-1">Mechanism</h3>
                            <p>{result.interaction.mechanism}</p>
                          </div>
                        )}
                        {result.interaction.clinicalEffect && (
                          <div className="bg-white/60 p-4 rounded-lg">
                            <h3 className="text-sm font-bold uppercase text-gray-500 mb-1">Clinical Effect</h3>
                            <p>{result.interaction.clinicalEffect}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {result.interaction?.management && (
                      <div className="mt-4 bg-white p-5 rounded-lg border-l-4 border-current">
                        <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Management Recommendation</h3>
                        <p className="font-semibold text-lg">{result.interaction.management}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="card">
                <h3 className="font-semibold mb-4 text-[var(--color-ink)]">Patient's active medications</h3>
                {result.existingMeds && result.existingMeds.length > 0 ? (
                  <ul className="space-y-2">
                    {result.existingMeds.map((med: any, idx: number) => (
                      <li key={idx} className="flex justify-between items-center py-2 border-b border-[var(--color-border)] last:border-0">
                        <span className="font-medium text-[var(--color-ink)]">{med.conceptName}</span>
                        <span className="text-xs text-[var(--color-ink-muted)] bg-[var(--color-surface)] px-2 py-1 rounded">
                          {med.vocabularyId}: {med.conceptCode || med.conceptId}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[var(--color-ink-muted)]">No active medications found.</p>
                )}
              </div>
              
              <div className="card flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold mb-4 text-[var(--color-ink)]">Knowledge Source</h3>
                  <p className="text-sm text-[var(--color-ink-secondary)] mb-4">
                    Interaction data sourced from trusted medical databases.
                  </p>
                  <div className="inline-block px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-sm">
                    {result.knowledgeSource || 'OMOP Vocabulary'}
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                  <button 
                    className="btn btn-ghost w-full" 
                    onClick={() => {
                      setResult(null);
                      setDrugName('');
                    }}
                  >
                    Check another drug
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PrescribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
        <div className="flex-1 flex items-center justify-center text-[var(--color-ink-muted)]">
          Loading...
        </div>
      </div>
    }>
      <PrescribeContent />
    </Suspense>
  );
}
