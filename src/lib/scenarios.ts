/**
 * Scenario catalog for the Today briefing generator.
 *
 * Mixes finance/work scenarios (the learner's two-year goal — meetings,
 * earnings calls, investor Q&A, roadshows) with general topics that keep the
 * daily habit sustainable (§5).
 */

import type { BriefingScenario } from './briefing';

export const SCENARIOS: BriefingScenario[] = [
  {
    key: 'just-talk',
    title: 'Just Talk — open conversation',
    prompt: 'Chat freely about my day, work, and thoughts. Follow my lead.',
    mode: 'JustTalk',
  },
  {
    key: 'weekend-plans',
    title: 'Weekend plans and small talk',
    prompt: 'Warm, casual small talk about weekends, food, travel, and hobbies.',
    mode: 'TopicTalk',
  },
  {
    key: 'team-standup',
    title: 'Team stand-up update',
    prompt:
      'I give a short status update; you play a colleague asking clarifying questions.',
    mode: 'ScenarioTalk',
  },
  {
    key: 'earnings-call',
    title: 'Earnings call — analyst Q&A',
    prompt:
      'Play a sell-side analyst on our earnings call. Ask about revenue drivers, margins, and guidance.',
    mode: 'ScenarioTalk',
  },
  {
    key: 'investor-meeting',
    title: 'Investor one-on-one',
    prompt:
      'Play an institutional investor in a 1:1. Probe our strategy, risks, and capital allocation.',
    mode: 'ScenarioTalk',
  },
  {
    key: 'roadshow-pitch',
    title: 'Roadshow pitch',
    prompt:
      'I pitch our investment thesis; you are a skeptical portfolio manager pushing back.',
    mode: 'ChallengeTalk',
  },
  {
    key: 'board-update',
    title: 'Board meeting update',
    prompt:
      'I brief the board on quarterly performance; you play a director asking pointed questions.',
    mode: 'ScenarioTalk',
  },
  {
    key: 'deal-negotiation',
    title: 'Deal negotiation',
    prompt:
      'We negotiate terms of a financing deal. You represent the counterparty and hold firm.',
    mode: 'ChallengeTalk',
  },
  {
    key: 'market-view',
    title: 'Explain your market view',
    prompt:
      'Ask me to explain my current view on rates, equities, or credit, and challenge my reasoning.',
    mode: 'TopicTalk',
  },
  {
    key: 'networking-dinner',
    title: 'Networking dinner',
    prompt:
      'Play a peer at an industry dinner. Balance light small talk with substantive shop talk.',
    mode: 'TopicTalk',
  },
];

export function getScenario(key: string): BriefingScenario | undefined {
  return SCENARIOS.find((s) => s.key === key);
}

/**
 * Deterministically rotate the featured scenario by day so "Today" feels fresh
 * without needing randomness (which would break reproducibility/tests).
 */
export function scenarioForDay(day: string, list: BriefingScenario[] = SCENARIOS): BriefingScenario {
  if (list.length === 0) throw new Error('No scenarios configured');
  // Sum char codes of the date for a stable index.
  let sum = 0;
  for (let i = 0; i < day.length; i++) sum += day.charCodeAt(i);
  return list[sum % list.length]!;
}
