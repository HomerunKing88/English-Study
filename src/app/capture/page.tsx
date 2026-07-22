'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui';
import { parseContract, type ContractParseResult } from '@/lib/contract';
import { captureSession, type CaptureResult } from '@/lib/capture';

type Phase = 'input' | 'saved';

export default function CapturePage() {
  const [raw, setRaw] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed: ContractParseResult | null = useMemo(
    () => (raw.trim() ? parseContract(raw) : null),
    [raw],
  );

  async function onSave() {
    if (!parsed || !parsed.ok) return;
    setSaving(true);
    setError(null);
    try {
      const res = await captureSession({
        payload: parsed.payload,
        transcriptRaw: raw.trim() || null,
      });
      setResult(res);
      setPhase('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setRaw('');
    setResult(null);
    setError(null);
    setPhase('input');
  }

  if (phase === 'saved' && result) {
    return (
      <div>
        <PageHeader title="Captured" subtitle="Saved to your permanent memory." />
        <div className="card mb-4">
          <ul className="space-y-1 text-sm text-ink-soft">
            <li>
              Session logged: <strong>{result.session.topic}</strong> ·{' '}
              {result.session.mode} · {result.session.difficulty}
            </li>
            <li>
              Expressions saved: <strong>{result.savedExpressionCount}</strong>
            </li>
            <li>
              Review targets updated: <strong>{result.reviewedTargetCount}</strong>
            </li>
          </ul>
        </div>
        <div className="flex gap-2">
          <Link href="/review" className="btn-accent flex-1">
            Go review
          </Link>
          <button type="button" className="btn-ghost flex-1" onClick={reset}>
            Capture another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Capture"
        subtitle="Paste the full transcript or just the final JSON block."
      />

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Paste your ChatGPT session here…"
        className="mb-3 h-56 w-full resize-y rounded-2xl border border-line bg-paper p-4 text-sm outline-none focus:border-accent"
      />

      {parsed && !parsed.ok ? (
        <div className="card mb-3 border-amber-300 bg-amber-50">
          <p className="text-sm font-medium text-amber-800">Couldn&apos;t auto-parse</p>
          <p className="mt-1 text-sm text-amber-700">{parsed.error}</p>
          {parsed.block ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-amber-800">
                Show detected block
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-paper p-3 text-xs">
                {parsed.block}
              </pre>
            </details>
          ) : null}
          <p className="mt-2 text-xs text-amber-700">
            Fix the JSON above and it will re-parse, or make sure the session ended
            with the required JSON block.
          </p>
        </div>
      ) : null}

      {parsed && parsed.ok ? (
        <ParsePreview parsed={parsed} />
      ) : null}

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        className="btn-primary w-full"
        disabled={!parsed || !parsed.ok || saving}
        onClick={onSave}
      >
        {saving ? 'Saving…' : 'Save session'}
      </button>
    </div>
  );
}

function ParsePreview({ parsed }: { parsed: Extract<ContractParseResult, { ok: true }> }) {
  const { payload } = parsed;
  return (
    <div className="card mb-3 border-accent">
      <p className="text-sm font-medium text-accent">Parsed successfully</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <Mini n={payload.corrections.length} label="corrections" />
        <Mini n={payload.new_expressions.length} label="new phrases" />
        <Mini n={payload.target_expression_usage.length} label="targets" />
      </div>
      {payload.focus_next ? (
        <p className="mt-3 rounded-lg bg-paper-soft p-3 text-sm text-ink-soft">
          <span className="label">Focus next</span>
          <br />
          {payload.focus_next}
        </p>
      ) : null}
    </div>
  );
}

function Mini({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <p className="text-xl font-semibold tabular-nums">{n}</p>
      <p className="label">{label}</p>
    </div>
  );
}
