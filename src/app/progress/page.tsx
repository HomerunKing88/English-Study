'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Loading } from '@/components/ui';
import { computeStats, type ProgressStats } from '@/lib/stats';
import type { Mastery } from '@/lib/types';

const MASTERY_ORDER: Mastery[] = ['New', 'Learning', 'Usable', 'Fluent', 'Forgotten'];

export default function ProgressPage() {
  const [stats, setStats] = useState<ProgressStats | null>(null);

  useEffect(() => {
    let live = true;
    computeStats().then((s) => {
      if (live) setStats(s);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!stats) return <Loading />;

  const total = MASTERY_ORDER.reduce((n, m) => n + stats.masteryBreakdown[m], 0);

  return (
    <div>
      <PageHeader title="Progress" subtitle="The compounding asset." />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Big value={`${stats.streak}`} label="Day streak" />
        <Big value={`${stats.sessionsLogged}`} label="Sessions logged" />
        <Big value={`${stats.expressionsLearned}`} label="Expressions" />
        <Big value={`${stats.reviewsDone}`} label="Reviews done" />
      </div>

      <section className="card mb-4">
        <p className="label mb-2">Review accuracy</p>
        {stats.accuracy === null ? (
          <p className="text-sm text-ink-faint">No reviews yet.</p>
        ) : (
          <p className="text-2xl font-semibold tabular-nums">
            {Math.round(stats.accuracy * 100)}%
          </p>
        )}
      </section>

      <section className="card mb-4">
        <p className="label mb-1">Automaticity (median Speak-it latency)</p>
        {stats.medianLatencyMs === null ? (
          <p className="text-sm text-ink-faint">
            Do some Speak-it cards to start measuring how fast you respond.
          </p>
        ) : (
          <p className="text-2xl font-semibold tabular-nums">
            {(stats.medianLatencyMs / 1000).toFixed(2)}s
          </p>
        )}
      </section>

      <section className="card">
        <p className="label mb-3">Mastery breakdown</p>
        {total === 0 ? (
          <p className="text-sm text-ink-faint">No expressions yet.</p>
        ) : (
          <div className="space-y-2">
            {MASTERY_ORDER.map((m) => {
              const n = stats.masteryBreakdown[m];
              const pct = total > 0 ? (n / total) * 100 : 0;
              return (
                <div key={m}>
                  <div className="mb-1 flex justify-between text-xs text-ink-faint">
                    <span>{m}</span>
                    <span className="tabular-nums">{n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-paper-sunk">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Big({ value, label }: { value: string; label: string }) {
  return (
    <div className="card text-center">
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      <p className="label mt-1">{label}</p>
    </div>
  );
}
