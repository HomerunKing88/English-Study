'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader, CopyButton, Loading } from '@/components/ui';
import { SCENARIOS, scenarioForDay } from '@/lib/scenarios';
import { buildCompactBriefing, buildFullBriefing, type BriefingScenario } from '@/lib/briefing';
import { pickReviewTargets, getDueExpressions } from '@/lib/expressions';
import { getSettings } from '@/lib/settings';
import { localDay } from '@/lib/id';
import type { Difficulty, Expression, Settings } from '@/lib/types';

const DIFFICULTIES: Difficulty[] = ['Comfortable', 'Natural', 'Challenging'];

export default function TodayPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [targets, setTargets] = useState<Expression[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [scenarioKey, setScenarioKey] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Natural');
  const [compact, setCompact] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const today = localDay();
      const [s, picked, due] = await Promise.all([
        getSettings(),
        pickReviewTargets(3),
        getDueExpressions(),
      ]);
      if (!live) return;
      setSettings(s);
      setTargets(picked);
      setDueCount(due.length);
      setDifficulty(s.dailyPlan.defaultDifficulty);
      setScenarioKey(scenarioForDay(today).key);
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, []);

  const scenario: BriefingScenario | undefined = useMemo(
    () => SCENARIOS.find((s) => s.key === scenarioKey),
    [scenarioKey],
  );

  const briefing = useMemo(() => {
    if (!settings || !scenario) return '';
    const input = {
      scenario,
      difficulty,
      targets,
      sessionMinutes: settings.dailyPlan.sessionMinutes,
      koreanHelpEnabled: settings.koreanHelpEnabled,
    };
    return compact ? buildCompactBriefing(input) : buildFullBriefing(input);
  }, [settings, scenario, difficulty, targets, compact]);

  if (loading || !settings) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Today"
        subtitle="Generate today's session, then talk it out in ChatGPT Voice."
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Streak" value={`${settings.streakCount}d`} />
        <Stat label="Reviews due" value={String(dueCount)} href="/review" />
        <Stat label="Targets today" value={String(targets.length)} />
      </div>

      <section className="card mb-4">
        <p className="label mb-2">Scenario</p>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setScenarioKey(s.key)}
              className={`chip ${
                s.key === scenarioKey ? 'border-accent bg-accent-soft text-ink' : ''
              }`}
            >
              {s.title.split(' — ')[0]}
            </button>
          ))}
        </div>

        <p className="label mb-2 mt-5">Difficulty</p>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`btn-ghost flex-1 ${
                d === difficulty ? 'border-accent bg-accent-soft' : ''
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      <section className="card mb-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="label">Session briefing</p>
          <label className="flex items-center gap-2 text-xs text-ink-faint">
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
            />
            Custom GPT (compact)
          </label>
        </div>

        {targets.length > 0 ? (
          <div className="mb-3 rounded-xl bg-paper-soft p-3">
            <p className="label mb-1">Weaving in {targets.length} review items</p>
            <ul className="text-sm text-ink-soft">
              {targets.map((t) => (
                <li key={t.id}>· {t.text}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-ink p-4 text-xs leading-relaxed text-paper">
          {briefing}
        </pre>

        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={briefing} label="Copy briefing" />
          <a
            href="https://chatgpt.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            Open ChatGPT →
          </a>
        </div>
      </section>

      <p className="text-center text-sm text-ink-faint">
        After the session, head to{' '}
        <Link href="/capture" className="font-medium text-accent underline">
          Capture
        </Link>{' '}
        and paste the result.
      </p>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <div className="card items-center py-3 text-center">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="label mt-0.5">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
