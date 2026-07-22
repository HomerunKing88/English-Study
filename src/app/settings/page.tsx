'use client';

import { useEffect, useRef, useState } from 'react';
import { PageHeader, Loading } from '@/components/ui';
import { getSettings, updateDailyPlan, updateSettings } from '@/lib/settings';
import { downloadBackup, importBackup, type ImportResult } from '@/lib/backup';
import type { Difficulty, Settings, SessionMode } from '@/lib/types';

const MODES: { value: SessionMode; label: string }[] = [
  { value: 'JustTalk', label: 'Just Talk' },
  { value: 'TopicTalk', label: 'Topic Talk' },
  { value: 'ScenarioTalk', label: 'Scenario Talk' },
  { value: 'ChallengeTalk', label: 'Challenge Talk' },
];
const DIFFICULTIES: Difficulty[] = ['Comfortable', 'Natural', 'Challenging'];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    getSettings().then((s) => {
      if (live) setSettings(s);
    });
    return () => {
      live = false;
    };
  }, []);

  async function patchPlan(patch: Parameters<typeof updateDailyPlan>[0]) {
    const next = await updateDailyPlan(patch);
    setSettings(next);
  }

  async function onImportFile(file: File) {
    setError(null);
    setMessage(null);
    try {
      const text = await file.text();
      const res: ImportResult = await importBackup(text);
      const fresh = await getSettings();
      setSettings(fresh);
      setMessage(
        `Imported ${res.expressions} expressions, ${res.sessions} sessions, ${res.reviewLogs} reviews.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    }
  }

  if (!settings) return <Loading />;

  return (
    <div>
      <PageHeader title="Settings" />

      <section className="card mb-4">
        <p className="label mb-3">Daily plan</p>

        <label className="mb-3 block">
          <span className="text-sm text-ink-soft">Review target / day</span>
          <input
            type="number"
            min={1}
            max={100}
            value={settings.dailyPlan.reviewTarget}
            onChange={(e) => patchPlan({ reviewTarget: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>

        <label className="mb-3 block">
          <span className="text-sm text-ink-soft">Session minutes</span>
          <input
            type="number"
            min={3}
            max={60}
            value={settings.dailyPlan.sessionMinutes}
            onChange={(e) => patchPlan({ sessionMinutes: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>

        <label className="mb-3 block">
          <span className="text-sm text-ink-soft">Default mode</span>
          <select
            value={settings.dailyPlan.defaultMode}
            onChange={(e) => patchPlan({ defaultMode: e.target.value as SessionMode })}
            className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-ink-soft">Default difficulty</span>
          <select
            value={settings.dailyPlan.defaultDifficulty}
            onChange={(e) => patchPlan({ defaultDifficulty: e.target.value as Difficulty })}
            className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card mb-4">
        <label className="flex items-center justify-between">
          <span className="text-sm text-ink-soft">
            Allow &quot;Need help in Korean?&quot;
          </span>
          <input
            type="checkbox"
            checked={settings.koreanHelpEnabled}
            onChange={async (e) => {
              const next = await updateSettings({ koreanHelpEnabled: e.target.checked });
              setSettings(next);
            }}
          />
        </label>
      </section>

      <section className="card">
        <p className="label mb-1">Backup</p>
        <p className="mb-3 text-sm text-ink-faint">
          Your learning history is the asset. Export it regularly — this is the only
          copy until cloud sync (Phase 2).
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              await downloadBackup();
              setMessage('Backup downloaded.');
            }}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => fileRef.current?.click()}
          >
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImportFile(f);
              e.target.value = '';
            }}
          />
        </div>
        {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <p className="mt-3 text-xs text-ink-faint">
          Importing replaces all current data with the backup&apos;s contents.
        </p>
      </section>
    </div>
  );
}
