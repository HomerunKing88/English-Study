'use client';

import { useCallback, useState } from 'react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-faint">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center gap-1 py-12 text-center">
      <p className="font-medium text-ink-soft">{title}</p>
      {hint ? <p className="text-sm text-ink-faint">{hint}</p> : null}
    </div>
  );
}

/** A button that copies text and flips its label to "Copied" briefly. */
export function CopyButton({
  text,
  label = 'Copy',
  className = 'btn-primary',
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsers without the async clipboard API.
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button type="button" className={className} onClick={onCopy}>
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

/** Loading placeholder used while IndexedDB reads resolve. */
export function Loading() {
  return <div className="py-16 text-center text-sm text-ink-faint">Loading…</div>;
}
