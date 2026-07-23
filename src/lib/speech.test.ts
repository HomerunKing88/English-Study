import { afterEach, describe, expect, it } from 'vitest';
import { speechRecognitionUnreliable } from './speech';

const original = {
  userAgent: Object.getOwnPropertyDescriptor(navigator, 'userAgent'),
  platform: Object.getOwnPropertyDescriptor(navigator, 'platform'),
  maxTouchPoints: Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints'),
};

function setNavigator(ua: string, platform = 'Win32', maxTouchPoints = 0): void {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(navigator, 'platform', { value: platform, configurable: true });
  Object.defineProperty(navigator, 'maxTouchPoints', {
    value: maxTouchPoints,
    configurable: true,
  });
}

afterEach(() => {
  for (const [key, desc] of Object.entries(original)) {
    if (desc) Object.defineProperty(navigator, key, desc);
  }
});

describe('speechRecognitionUnreliable', () => {
  it('is true on an iPhone', () => {
    setNavigator(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    );
    expect(speechRecognitionUnreliable()).toBe(true);
  });

  it('is true on an iPad', () => {
    setNavigator(
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    );
    expect(speechRecognitionUnreliable()).toBe(true);
  });

  it('is true on iPadOS masquerading as desktop Safari (touch device)', () => {
    setNavigator(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'MacIntel',
      5,
    );
    expect(speechRecognitionUnreliable()).toBe(true);
  });

  it('is false on desktop Chrome (Windows)', () => {
    setNavigator(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    );
    expect(speechRecognitionUnreliable()).toBe(false);
  });

  it('is false on desktop macOS Safari (no touch)', () => {
    setNavigator(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'MacIntel',
      0,
    );
    expect(speechRecognitionUnreliable()).toBe(false);
  });
});
