/**
 * Scenario catalog for the Today briefing generator, split into two tracks.
 *
 * Priority order (the learner's stated goal):
 *   1. `everyday`  — free, natural daily conversation. This is the PRIMARY goal
 *                    and the default track; it has the richest scenario set.
 *   2. `finance`   — finance/business English (meetings, earnings calls,
 *                    investor Q&A, roadshows), studied deliberately at its own
 *                    time. Deeper vocabulary study lives in Explore.
 */

import type { BriefingScenario, Track } from './briefing';

export const TRACK_META: Record<Track, { label: string; blurb: string }> = {
  everyday: {
    label: 'Everyday',
    blurb: 'Daily conversation — your primary goal.',
  },
  finance: {
    label: 'Finance & Business',
    blurb: 'Work English, on its own schedule.',
  },
};

export const TRACK_ORDER: Track[] = ['everyday', 'finance'];

// ---------------------------------------------------------------------------
// Track 1 — Everyday conversation (primary)
// ---------------------------------------------------------------------------

const EVERYDAY: BriefingScenario[] = [
  {
    key: 'just-talk',
    title: 'Just Talk — open conversation',
    prompt: 'Chat freely about my day, my thoughts, and whatever comes up. Follow my lead.',
    mode: 'JustTalk',
    track: 'everyday',
  },
  {
    key: 'daily-recap',
    title: 'How was your day?',
    prompt: 'Ask me about my day in detail — what I did, how I felt, small moments. Keep it flowing.',
    mode: 'JustTalk',
    track: 'everyday',
  },
  {
    key: 'weekend-plans',
    title: 'Weekend plans',
    prompt: 'Casual chat about weekend plans, then react and suggest things a friend would.',
    mode: 'TopicTalk',
    track: 'everyday',
  },
  {
    key: 'small-talk',
    title: 'Small talk',
    prompt: 'Light small talk — weather, coffee, the commute, how things are going. Keep it easy.',
    mode: 'TopicTalk',
    track: 'everyday',
  },
  {
    key: 'tell-a-story',
    title: 'Tell a story',
    prompt: 'Ask me to tell a story about something that happened recently, and react naturally.',
    mode: 'TopicTalk',
    track: 'everyday',
  },
  {
    key: 'share-opinion',
    title: 'Share your opinion',
    prompt: 'Pick a light everyday topic (movies, food, travel) and ask my opinion, then gently push back.',
    mode: 'TopicTalk',
    track: 'everyday',
  },
  {
    key: 'hobbies',
    title: 'Hobbies & interests',
    prompt: 'Talk about hobbies and free time. Ask what I enjoy and why, and share too.',
    mode: 'TopicTalk',
    track: 'everyday',
  },
  {
    key: 'travel-chat',
    title: 'Travel & experiences',
    prompt: 'Chat about travel — places I have been or want to go, memorable trips.',
    mode: 'TopicTalk',
    track: 'everyday',
  },
  {
    key: 'restaurant',
    title: 'At a restaurant / café',
    prompt: 'Role-play a server. I order, ask questions, and make small talk about the food.',
    mode: 'ScenarioTalk',
    track: 'everyday',
  },
  {
    key: 'making-plans',
    title: 'Making plans with a friend',
    prompt: 'Play a friend. We try to make plans to meet up — suggest times, places, and go back and forth.',
    mode: 'ScenarioTalk',
    track: 'everyday',
  },
  {
    key: 'catch-up',
    title: 'Catching up with a friend',
    prompt: "Play an old friend I haven't seen in a while. Catch up warmly on life, work, and family.",
    mode: 'ScenarioTalk',
    track: 'everyday',
  },
  {
    key: 'daily-errands',
    title: 'Everyday situations',
    prompt: 'Role-play a real-life errand (asking directions, a shop, a phone booking). Keep it practical.',
    mode: 'ScenarioTalk',
    track: 'everyday',
  },
];

// ---------------------------------------------------------------------------
// Track 2 — Finance & business (secondary)
// ---------------------------------------------------------------------------

const FINANCE: BriefingScenario[] = [
  {
    key: 'team-standup',
    title: 'Team stand-up update',
    prompt:
      'I give a short status update; you play a colleague asking clarifying questions.',
    mode: 'ScenarioTalk',
    track: 'finance',
  },
  {
    key: 'earnings-call',
    title: 'Earnings call — analyst Q&A',
    prompt:
      'Play a sell-side analyst on our earnings call. Ask about revenue drivers, margins, and guidance.',
    mode: 'ScenarioTalk',
    track: 'finance',
  },
  {
    key: 'investor-meeting',
    title: 'Investor one-on-one',
    prompt:
      'Play an institutional investor in a 1:1. Probe our strategy, risks, and capital allocation.',
    mode: 'ScenarioTalk',
    track: 'finance',
  },
  {
    key: 'roadshow-pitch',
    title: 'Roadshow pitch',
    prompt:
      'I pitch our investment thesis; you are a skeptical portfolio manager pushing back.',
    mode: 'ChallengeTalk',
    track: 'finance',
  },
  {
    key: 'board-update',
    title: 'Board meeting update',
    prompt:
      'I brief the board on quarterly performance; you play a director asking pointed questions.',
    mode: 'ScenarioTalk',
    track: 'finance',
  },
  {
    key: 'deal-negotiation',
    title: 'Deal negotiation',
    prompt:
      'We negotiate terms of a financing deal. You represent the counterparty and hold firm.',
    mode: 'ChallengeTalk',
    track: 'finance',
  },
  {
    key: 'market-view',
    title: 'Explain your market view',
    prompt:
      'Ask me to explain my current view on rates, equities, or credit, and challenge my reasoning.',
    mode: 'TopicTalk',
    track: 'finance',
  },
  {
    key: 'networking-dinner',
    title: 'Networking dinner',
    prompt:
      'Play a peer at an industry dinner. Balance light small talk with substantive shop talk.',
    mode: 'TopicTalk',
    track: 'finance',
  },
];

export const SCENARIOS: BriefingScenario[] = [...EVERYDAY, ...FINANCE];

export function getScenario(key: string): BriefingScenario | undefined {
  return SCENARIOS.find((s) => s.key === key);
}

export function scenariosByTrack(track: Track): BriefingScenario[] {
  return SCENARIOS.filter((s) => s.track === track);
}

/**
 * Deterministically rotate the featured scenario by day so "Today" feels fresh
 * without needing randomness (which would break reproducibility/tests). Pass a
 * track's scenario list to feature within that track.
 */
export function scenarioForDay(
  day: string,
  list: BriefingScenario[] = EVERYDAY,
): BriefingScenario {
  if (list.length === 0) throw new Error('No scenarios configured');
  // Sum char codes of the date for a stable index.
  let sum = 0;
  for (let i = 0; i < day.length; i++) sum += day.charCodeAt(i);
  return list[sum % list.length]!;
}
