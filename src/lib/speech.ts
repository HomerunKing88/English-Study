/**
 * Web Speech API wrapper for Speak-it cards.
 *
 * Uses the browser's SpeechRecognition (input) and speechSynthesis (prompt
 * readout). This is the only quantitative proxy for "thinking in English"
 * (Principle 5): we measure the latency between showing the prompt and the
 * learner starting to speak.
 *
 * All functions degrade gracefully: `isSpeechSupported()` lets the UI hide
 * Speak-it affordances where the API is missing (e.g. Firefox, SSR).
 */

// The Web Speech API types are not in the default TS lib in a stable form, so
// we describe the minimal surface we use.
interface SpeechRecognitionResultLike {
  0: { transcript: string; confidence: number };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
  resultIndex: number;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onspeechstart: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

/**
 * iOS Safari — especially inside a standalone (home-screen) PWA — exposes
 * `webkitSpeechRecognition` but its implementation is unreliable and can lock up
 * the whole WebView when started. We treat it as unusable there and fall back to
 * a manual "say it aloud" flow rather than risk freezing the app.
 */
export function speechRecognitionUnreliable(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIosDevice = /iPhone|iPad|iPod/i.test(ua);
  // iPadOS 13+ reports as desktop Safari but is a touch device.
  const isIpadOs =
    navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
  const isStandalone =
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    (typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches);
  return isIosDevice || isIpadOs || (isStandalone && /Safari/i.test(ua));
}

/** Whether the mic-based Speak-it path should be offered at all. */
export function isSpeechRecognitionUsable(): boolean {
  return isSpeechRecognitionSupported() && !speechRecognitionUnreliable();
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Speak a prompt aloud (e.g. read the meaning the learner must say). */
export function speak(text: string, lang = 'en-US'): void {
  if (!isSpeechSynthesisSupported()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export interface SpeakItSession {
  /** Stop listening and release the microphone. */
  stop: () => void;
}

export interface SpeakItCallbacks {
  /** Fired the moment speech is detected — used to compute latency. */
  onSpeechStart?: (latencyMs: number) => void;
  /** Fired with the (possibly interim) transcript. */
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

/**
 * Start a Speak-it capture. `promptShownAt` is the timestamp (ms) when the card
 * was presented; latency is measured from there to first detected speech.
 * Returns a handle to stop, or null if unsupported.
 */
/** Hard cap on a single listen so the UI can never get stuck waiting for an
 * `onend` that some engines never fire. */
const MAX_LISTEN_MS = 20_000;

export function startSpeakIt(
  promptShownAt: number,
  cb: SpeakItCallbacks,
  lang = 'en-US',
): SpeakItSession | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;

  // Avoid an audio-session conflict with the "Hear it" prompt readout.
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = true;
  let firedStart = false;
  let ended = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const finish = () => {
    if (ended) return;
    ended = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    cb.onEnd?.();
  };

  const safeAbort = () => {
    try {
      rec.abort();
    } catch {
      // Some engines throw on abort; treat it as ended regardless.
    }
    finish();
  };

  rec.onspeechstart = () => {
    if (firedStart) return;
    firedStart = true;
    cb.onSpeechStart?.(Math.max(0, Date.now() - promptShownAt));
  };

  rec.onresult = (e) => {
    let text = '';
    let isFinal = false;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (!r) continue;
      text += r[0].transcript;
      if (r.isFinal) isFinal = true;
    }
    // Some engines skip onspeechstart; treat first result as the start too.
    if (!firedStart && text.trim()) {
      firedStart = true;
      cb.onSpeechStart?.(Math.max(0, Date.now() - promptShownAt));
    }
    cb.onTranscript?.(text.trim(), isFinal);
  };

  rec.onerror = (e) => {
    cb.onError?.(e.error);
    finish();
  };
  rec.onend = () => finish();

  try {
    rec.start();
  } catch {
    return null;
  }

  // Safety net: force-stop if nothing ever ends the session.
  timer = setTimeout(safeAbort, MAX_LISTEN_MS);

  return { stop: safeAbort };
}
