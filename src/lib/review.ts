/**
 * Review card construction.
 *
 * Given a due Expression, build a concrete card of a chosen type. Card types
 * (§4): Recognition, Fill-in-blank, Use-in-sentence, Explain-in-English,
 * Speak-it. Everything routes back to speaking (Principle 2), so Speak-it and
 * Use-in-sentence are weighted toward once an item is past the earliest stage.
 */

import type { CardType, Expression } from './types';

export interface ReviewCard {
  expressionId: string;
  cardType: CardType;
  /** What the learner sees / hears. */
  prompt: string;
  /** The reference answer to self-check against. */
  answer: string;
  /** Supporting hint (meaning), shown after an attempt. */
  hint: string;
}

const ALL_TYPES: CardType[] = [
  'Recognition',
  'FillInBlank',
  'UseInSentence',
  'ExplainInEnglish',
  'SpeakIt',
];

export function cardTypeLabel(type: CardType): string {
  switch (type) {
    case 'Recognition':
      return 'Recognition';
    case 'FillInBlank':
      return 'Fill in the blank';
    case 'UseInSentence':
      return 'Use in a sentence';
    case 'ExplainInEnglish':
      return 'Explain in English';
    case 'SpeakIt':
      return 'Speak it';
  }
}

/** Best example sentence for building fill-in-blank / recognition prompts. */
function bestExample(expr: Expression): string | null {
  const candidates = [
    expr.naturalSentence,
    ...expr.examples,
    expr.correctedSentence,
  ].filter((x): x is string => Boolean(x && x.trim()));
  return candidates[0] ?? null;
}

function blankOut(sentence: string, phrase: string): string | null {
  const idx = sentence.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx === -1) return null;
  return (
    sentence.slice(0, idx) + '_____' + sentence.slice(idx + phrase.length)
  );
}

/**
 * Choose a card type appropriate to the expression's maturity and available
 * data. Deterministic given (expression, seed) so tests are stable.
 */
export function chooseCardType(expr: Expression, seed = 0): CardType {
  const example = bestExample(expr);
  const usable: CardType[] = [];

  // Recognition and Speak-it and Explain always work.
  usable.push('Recognition', 'ExplainInEnglish', 'SpeakIt', 'UseInSentence');
  // Fill-in-blank only works when an example actually contains the phrase.
  if (example && blankOut(example, expr.text)) usable.push('FillInBlank');

  // Newer items lean on Recognition; matured items lean on production.
  if (expr.mastery === 'New' || expr.mastery === 'Learning') {
    const early: CardType[] = usable.filter(
      (t) => t === 'Recognition' || t === 'FillInBlank' || t === 'SpeakIt',
    );
    return early[seed % early.length] ?? 'Recognition';
  }
  return usable[seed % usable.length] ?? 'SpeakIt';
}

export function buildCard(expr: Expression, type?: CardType, seed = 0): ReviewCard {
  const cardType = type ?? chooseCardType(expr, seed);
  const example = bestExample(expr);

  switch (cardType) {
    case 'Recognition':
      return {
        expressionId: expr.id,
        cardType,
        prompt: `What does this mean, and when would you use it?\n\n“${expr.text}”`,
        answer: expr.meaning,
        hint: expr.meaning,
      };
    case 'FillInBlank': {
      const blanked = example ? blankOut(example, expr.text) : null;
      return {
        expressionId: expr.id,
        cardType,
        prompt: blanked
          ? `Fill in the blank:\n\n${blanked}`
          : `Complete a sentence using: “${expr.text}”`,
        answer: example ?? expr.text,
        hint: expr.meaning,
      };
    }
    case 'UseInSentence':
      return {
        expressionId: expr.id,
        cardType,
        prompt: `Use this in a natural sentence about your work:\n\n“${expr.text}”`,
        answer: example ?? expr.meaning,
        hint: expr.meaning,
      };
    case 'ExplainInEnglish':
      return {
        expressionId: expr.id,
        cardType,
        prompt: `Explain the meaning of “${expr.text}” in your own English words.`,
        answer: expr.meaning,
        hint: example ?? expr.meaning,
      };
    case 'SpeakIt':
      return {
        expressionId: expr.id,
        cardType,
        prompt: `Say a sentence out loud using “${expr.text}”. Speak as soon as you're ready.`,
        answer: example ?? expr.meaning,
        hint: expr.meaning,
      };
  }
}

export { ALL_TYPES as ALL_CARD_TYPES };
