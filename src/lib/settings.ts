/**
 * Settings + streak repository. Singleton row keyed "settings".
 */

import * as db from './db';
import { localDay, nowIso } from './id';
import type { DailyPlanConfig, Settings } from './types';

const DEFAULT_PLAN: DailyPlanConfig = {
  reviewTarget: 15,
  sessionMinutes: 10,
  defaultMode: 'TopicTalk',
  defaultDifficulty: 'Natural',
};

function defaultSettings(): Settings {
  const now = nowIso();
  return {
    id: 'settings',
    streakCount: 0,
    lastActiveDate: null,
    dailyPlan: DEFAULT_PLAN,
    koreanHelpEnabled: true,
    usesCustomGpt: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getSettings(): Promise<Settings> {
  const existing = await db.get('settings', 'settings');
  if (existing) {
    // Backfill fields added in later versions so older stored settings (and
    // imported backups) always satisfy the current Settings shape.
    return {
      ...defaultSettings(),
      ...existing,
      dailyPlan: { ...DEFAULT_PLAN, ...existing.dailyPlan },
    };
  }
  const fresh = defaultSettings();
  await db.put('settings', fresh);
  return fresh;
}

export async function updateSettings(
  patch: Partial<Omit<Settings, 'id' | 'createdAt'>>,
): Promise<Settings> {
  const current = await getSettings();
  const updated: Settings = { ...current, ...patch, updatedAt: nowIso() };
  return db.put('settings', updated);
}

export async function updateDailyPlan(
  patch: Partial<DailyPlanConfig>,
): Promise<Settings> {
  const current = await getSettings();
  return updateSettings({ dailyPlan: { ...current.dailyPlan, ...patch } });
}

/**
 * Advance the streak for "activity today". Called when the learner logs a
 * session or completes reviews. Idempotent within a single calendar day:
 * - same day again → no change
 * - consecutive day → +1
 * - gap of >1 day → reset to 1
 */
export async function markActiveToday(today: string = localDay()): Promise<Settings> {
  const current = await getSettings();
  if (current.lastActiveDate === today) return current;

  let streak = 1;
  if (current.lastActiveDate) {
    const prev = new Date(current.lastActiveDate + 'T00:00:00');
    const cur = new Date(today + 'T00:00:00');
    const dayMs = 24 * 60 * 60 * 1000;
    const diff = Math.round((cur.getTime() - prev.getTime()) / dayMs);
    streak = diff === 1 ? current.streakCount + 1 : 1;
  }

  return updateSettings({ streakCount: streak, lastActiveDate: today });
}
