'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { PageHeader, EmptyState, Loading } from '@/components/ui';
import { getDueExpressions, recordReview } from '@/lib/expressions';
import { logReview } from '@/lib/sessions';
import { markActiveToday } from '@/lib/settings';
import { buildCard, cardTypeLabel, type ReviewCard } from '@/lib/review';
import { intervalPreview } from '@/lib/fsrs';
import {
  isSpeechRecognitionSupported,
  speak,
  startSpeakIt,
  type SpeakItSession,
} from '@/lib/speech';
import type { Expression, Rating } from '@/lib/types';

const RATINGS: Rating[] = ['Again', 'Hard', 'Good', 'Easy'];

export default function ReviewPage() {
  const [queue, setQueue] = useState<Expression[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const due = await getDueExpressions();
      if (!live) return;
      setQueue(due);
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, []);

  const current = queue[idx];
  const card: ReviewCard | null = useMemo(
    () => (current ? buildCard(current, undefined, done) : null),
    [current, done],
  );

  const previews = useMemo(
    () => (current ? intervalPreview(current.fsrs) : null),
    [current],
  );

  const onRate = useCallback(
    async (rating: Rating, latencyMs: number | null, cardType: ReviewCard['cardType']) => {
      if (!current) return;
      await recordReview(current.id, rating);
      await logReview({ expressionId: current.id, cardType, rating, latencyMs });
      await markActiveToday();
      setDone((d) => d + 1);
      setRevealed(false);
      setIdx((i) => i + 1);
    },
    [current],
  );

  if (loading) return <Loading />;

  if (!current || !card) {
    return (
      <div>
        <PageHeader title="Review" />
        {done > 0 ? (
          <div className="card text-center">
            <p className="text-lg font-semibold">All done ✓</p>
            <p className="mt-1 text-sm text-ink-faint">
              You reviewed {done} {done === 1 ? 'card' : 'cards'} today.
            </p>
            <Link href="/" className="btn-primary mt-4 inline-flex">
              Back to Today
            </Link>
          </div>
        ) : (
          <EmptyState
            title="Nothing due right now"
            hint="Log a session in Capture or save concepts from Explore to build your queue."
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Review"
        subtitle={`${idx + 1} of ${queue.length} · ${done} done`}
      />
      <CardView
        key={current.id}
        card={card}
        previews={previews}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        onRate={onRate}
      />
    </div>
  );
}

function CardView({
  card,
  previews,
  revealed,
  onReveal,
  onRate,
}: {
  card: ReviewCard;
  previews: Record<Rating, string> | null;
  revealed: boolean;
  onReveal: () => void;
  onRate: (rating: Rating, latencyMs: number | null, cardType: ReviewCard['cardType']) => void;
}) {
  const isSpeak = card.cardType === 'SpeakIt';
  const speechOk = isSpeak && isSpeechRecognitionSupported();

  const [latency, setLatency] = useState<number | null>(null);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const shownAt = useRef<number>(Date.now());
  const sessionRef = useRef<SpeakItSession | null>(null);

  useEffect(() => {
    shownAt.current = Date.now();
    return () => sessionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    setTranscript('');
    setLatency(null);
    shownAt.current = Date.now();
    const s = startSpeakIt(shownAt.current, {
      onSpeechStart: (ms) => setLatency(ms),
      onTranscript: (text) => setTranscript(text),
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    if (s) {
      sessionRef.current = s;
      setListening(true);
    }
  }, []);

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <span className="chip">{cardTypeLabel(card.cardType)}</span>
        {isSpeak ? (
          <button
            type="button"
            onClick={() => speak(card.prompt)}
            className="text-sm text-ink-faint hover:text-ink"
            aria-label="Read prompt aloud"
          >
            🔊 Hear it
          </button>
        ) : null}
      </div>

      <p className="whitespace-pre-wrap text-lg leading-relaxed">{card.prompt}</p>

      {speechOk ? (
        <div className="mt-4 rounded-xl bg-paper-soft p-4">
          <button
            type="button"
            className={listening ? 'btn-ghost' : 'btn-accent'}
            onClick={listening ? () => sessionRef.current?.stop() : startListening}
          >
            {listening ? 'Stop' : '🎙 Start speaking'}
          </button>
          {latency !== null ? (
            <p className="mt-3 text-sm text-ink-soft">
              Response latency:{' '}
              <strong className="tabular-nums">{(latency / 1000).toFixed(2)}s</strong>
            </p>
          ) : null}
          {transcript ? (
            <p className="mt-2 text-sm italic text-ink-faint">“{transcript}”</p>
          ) : null}
        </div>
      ) : null}

      {isSpeak && !speechOk ? (
        <p className="mt-3 text-xs text-ink-faint">
          Speech recognition isn&apos;t available in this browser — say it aloud
          yourself, then reveal and rate.
        </p>
      ) : null}

      {!revealed ? (
        <button type="button" className="btn-primary mt-5 w-full" onClick={onReveal}>
          Reveal answer
        </button>
      ) : (
        <>
          <div className="mt-5 rounded-xl border border-line bg-paper-soft p-4">
            <p className="label mb-1">Reference</p>
            <p className="text-ink-soft">{card.answer}</p>
            {card.hint && card.hint !== card.answer ? (
              <p className="mt-2 text-sm text-ink-faint">{card.hint}</p>
            ) : null}
          </div>

          <p className="label mb-2 mt-5">How well did you recall it?</p>
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r}
                type="button"
                className="btn-ghost flex-col gap-0 py-2"
                onClick={() => onRate(r, latency, card.cardType)}
              >
                <span className="text-sm font-medium">{r}</span>
                {previews ? (
                  <span className="text-[10px] text-ink-faint">{previews[r]}</span>
                ) : null}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
