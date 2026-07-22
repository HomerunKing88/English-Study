import { describe, expect, it } from 'vitest';
import { extractLastJsonBlock, parseContract } from './contract';

const VALID = {
  session: { topic: 'Earnings call', mode: 'Scenario Talk', difficulty: 'Natural' },
  corrections: [
    {
      user_said: 'We are grow fast',
      corrected: 'We are growing fast',
      natural: "We're scaling quickly",
      note_en: 'Use the -ing form after "are".',
    },
  ],
  new_expressions: [
    { expression: 'top line', meaning_en: 'total revenue', example: 'Our top line grew 20%.' },
  ],
  target_expression_usage: [{ expression: 'headwind', used_correctly: true }],
  focus_next: 'Practice present continuous.',
};

function fenced(obj: unknown, lang = 'json'): string {
  return '```' + lang + '\n' + JSON.stringify(obj, null, 2) + '\n```';
}

describe('extractLastJsonBlock', () => {
  it('returns null for empty input', () => {
    expect(extractLastJsonBlock('   ')).toBeNull();
  });

  it('finds a json-fenced block amid prose', () => {
    const text = `Here is your summary.\n\n${fenced(VALID)}\n\nGreat session!`;
    const block = extractLastJsonBlock(text);
    expect(block).not.toBeNull();
    expect(JSON.parse(block!).session.topic).toBe('Earnings call');
  });

  it('prefers the LAST json block when several exist', () => {
    const first = fenced({ ...VALID, focus_next: 'first' });
    const last = fenced({ ...VALID, focus_next: 'last' });
    const text = `${first}\n\nsome chatter\n\n${last}`;
    const block = extractLastJsonBlock(text)!;
    expect(JSON.parse(block).focus_next).toBe('last');
  });

  it('accepts an unlabeled fence whose body is JSON', () => {
    const text = fenced(VALID, '');
    const block = extractLastJsonBlock(text);
    expect(block).not.toBeNull();
  });

  it('accepts a bare JSON object with no fences', () => {
    const text = JSON.stringify(VALID);
    const block = extractLastJsonBlock(text);
    expect(block).not.toBeNull();
  });
});

describe('parseContract', () => {
  it('parses and validates a correct payload', () => {
    const res = parseContract(fenced(VALID));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.payload.corrections).toHaveLength(1);
      expect(res.payload.target_expression_usage[0]!.used_correctly).toBe(true);
    }
  });

  it('fails with the raw block preserved when a field is missing', () => {
    const broken = { ...VALID } as Record<string, unknown>;
    delete broken.focus_next;
    const res = parseContract(fenced(broken));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.block).not.toBeNull();
      expect(res.error).toContain('focus_next');
    }
  });

  it('reports when no JSON block is present', () => {
    const res = parseContract('just a plain sentence, no json here');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.block).toBeNull();
  });

  it('reports invalid JSON inside a fence', () => {
    const res = parseContract('```json\n{ not: valid, }\n```');
    expect(res.ok).toBe(false);
  });
});
