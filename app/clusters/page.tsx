'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MatrixRow {
  condition: string;
  total: number;
  [key: string]: string | number;
}

interface ClusterResponse {
  ok: boolean;
  mocked?: boolean;
  note?: string;
  total?: number;
  records?: { condition: string; hostel: string; date: string }[];
  matrix?: MatrixRow[];
  conditions?: string[];
  hostels?: string[];
  spike?: { condition: string; hostel: string; count: number };
  dateRange?: { from: string; to: string };
  error?: { code: string; message: string };
}

export default function ClustersPage() {
  const [data, setData] = useState<ClusterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/clusters/mock');
        const json = await res.json();
        
        if (json.ok) {
          setData(json);
        } else {
          setError(json.error?.message || 'Failed to fetch cluster data');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  const HOSTEL_COLORS = ['#283238', '#5B8A9A', '#8BB8A8', '#D4A574', '#A0C4B4', '#E6C6A1'];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <a href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--color-ink)] hover:opacity-80 transition-opacity">
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

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="pill pill-warn !text-base !px-4 !py-3 !rounded-lg flex w-full">
          <span className="font-medium">Preview — mocked data. Live multi-twin clustering arrives in Phase 2.</span>
        </div>

        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-[var(--color-ink)] mb-2">Campus health clusters</h1>
          <p className="text-[var(--color-ink-secondary)] text-lg">Condition reports across OAU hostels — identifying potential outbreaks.</p>
        </div>

        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card h-24 bg-gray-100 rounded-lg"></div>
              ))}
            </div>
            <div className="card h-32 bg-gray-100 rounded-lg"></div>
            <div className="card h-96 bg-gray-100 rounded-lg"></div>
          </div>
        ) : error ? (
          <div className="card border-red-200 bg-red-50 text-red-700 p-6">
            <h3 className="font-semibold mb-2">Error loading data</h3>
            <p>{error}</p>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-6">
                <div className="text-sm font-medium text-[var(--color-ink-muted)] mb-1 uppercase tracking-wider">Total reports</div>
                <div className="text-3xl font-semibold">{data.total}</div>
              </div>
              <div className="card p-6">
                <div className="text-sm font-medium text-[var(--color-ink-muted)] mb-1 uppercase tracking-wider">Conditions tracked</div>
                <div className="text-3xl font-semibold">{data.conditions?.length || 0}</div>
              </div>
              <div className="card p-6">
                <div className="text-sm font-medium text-[var(--color-ink-muted)] mb-1 uppercase tracking-wider">Hostels</div>
                <div className="text-3xl font-semibold">{data.hostels?.length || 0}</div>
              </div>
              <div className="card p-6">
                <div className="text-sm font-medium text-[var(--color-ink-muted)] mb-1 uppercase tracking-wider">Date range</div>
                <div className="text-sm font-semibold">{data.dateRange?.from}<br/>to {data.dateRange?.to}</div>
              </div>
            </div>

            {data.spike && (
              <div className="card bg-orange-50 border-orange-200 p-6 flex items-start gap-4 shadow-sm">
                <div className="bg-orange-200 text-orange-700 p-2 rounded-full mt-1 shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-orange-900 mb-1">Cluster detected</h3>
                  <p className="text-orange-800 text-lg">
                    <strong className="text-2xl">{data.spike.count}</strong> cases of <strong>{data.spike.condition}</strong> in <strong>{data.spike.hostel}</strong>
                  </p>
                </div>
              </div>
            )}

            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-6">Conditions by Hostel</h3>
              <div className="h-[400px] w-full">
                {data.matrix && data.hostels && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.matrix}
                      margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="condition" axisLine={false} tickLine={false} tick={{fill: 'var(--color-ink-secondary)', fontSize: 13}} tickMargin={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--color-ink-secondary)', fontSize: 13}} tickMargin={10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        cursor={{fill: '#F3F4F6'}}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      {data.hostels.map((hostel, index) => (
                        <Bar 
                          key={hostel} 
                          dataKey={hostel} 
                          fill={HOSTEL_COLORS[index % HOSTEL_COLORS.length]} 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={50}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="card p-6 overflow-hidden">
              <h3 className="text-xl font-semibold mb-4">Cluster Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr>
                      <th className="p-3 border-b border-[var(--color-border)] font-semibold text-sm text-[var(--color-ink-secondary)]">Condition</th>
                      {data.hostels?.map((hostel) => (
                        <th key={hostel} className="p-3 border-b border-[var(--color-border)] font-semibold text-sm text-[var(--color-ink-secondary)] text-center">{hostel}</th>
                      ))}
                      <th className="p-3 border-b border-[var(--color-border)] font-semibold text-sm text-[var(--color-ink-secondary)] text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.matrix?.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 border-b border-[var(--color-border)] last:border-0 transition-colors">
                        <td className="p-3 font-medium text-sm text-[var(--color-ink)]">{row.condition}</td>
                        {data.hostels?.map((hostel) => {
                          const val = row[hostel] as number;
                          const isSpike = data.spike && data.spike.condition === row.condition && data.spike.hostel === hostel;
                          return (
                            <td 
                              key={hostel} 
                              className={`p-3 text-sm text-center ${isSpike ? 'font-bold bg-orange-100 text-orange-900 rounded-md' : 'text-[var(--color-ink-secondary)]'}`}
                            >
                              {val || 0}
                            </td>
                          );
                        })}
                        <td className="p-3 font-bold text-sm text-center text-[var(--color-ink)] bg-gray-50/80">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {data.note && (
              <div className="text-sm text-[var(--color-ink-muted)] text-center py-4 italic">
                {data.note}
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
