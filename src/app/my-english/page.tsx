'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Loading, EmptyState } from '@/components/ui';
import {
  getAllExpressions,
  upsertExpression,
  updateExpression,
  deleteExpression,
} from '@/lib/expressions';
import type { Expression, Mastery } from '@/lib/types';

const MASTERY_ORDER: Mastery[] = ['New', 'Learning', 'Usable', 'Fluent', 'Forgotten'];

export default function MyEnglishPage() {
  const [items, setItems] = useState<Expression[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [newMeaning, setNewMeaning] = useState('');

  async function refresh() {
    const all = await getAllExpressions();
    setItems(all);
    setLoading(false);
  }

  useEffect(() => {
    let live = true;
    getAllExpressions().then((all) => {
      if (!live) return;
      setItems(all);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (e) => e.text.toLowerCase().includes(q) || e.meaning.toLowerCase().includes(q),
    );
  }, [items, query]);

  async function onAdd() {
    if (!newText.trim() || !newMeaning.trim()) return;
    await upsertExpression({ text: newText, meaning: newMeaning, source: 'manual' });
    setNewText('');
    setNewMeaning('');
    setAdding(false);
    await refresh();
  }

  async function onDelete(id: string) {
    await deleteExpression(id);
    await refresh();
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="My English"
        subtitle={`${items.length} expressions in your permanent memory`}
        action={
          <button type="button" className="btn-primary" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Close' : '+ Add'}
          </button>
        }
      />

      {adding ? (
        <div className="card mb-4 space-y-2">
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Expression (English)"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            value={newMeaning}
            onChange={(e) => setNewMeaning(e.target.value)}
            placeholder="Meaning (English)"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button type="button" className="btn-accent w-full" onClick={onAdd}>
            Save expression
          </button>
        </div>
      ) : null}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your expressions…"
        className="mb-4 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent"
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No expressions yet"
          hint="They appear automatically when you capture a session, or add your own."
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((e) => (
            <ExpressionRow key={e.id} item={e} onDelete={onDelete} onChanged={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
}

function masteryColor(m: Mastery): string {
  const idx = MASTERY_ORDER.indexOf(m);
  if (m === 'Forgotten') return 'text-red-600';
  if (m === 'Fluent') return 'text-accent';
  return idx >= 2 ? 'text-ink-soft' : 'text-ink-faint';
}

function ExpressionRow({
  item,
  onDelete,
  onChanged,
}: {
  item: Expression;
  onDelete: (id: string) => void;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [meaning, setMeaning] = useState(item.meaning);

  async function save() {
    await updateExpression(item.id, { meaning });
    setOpen(false);
    await onChanged();
  }

  return (
    <li className="card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate font-medium">{item.text}</p>
          <p className="truncate text-sm text-ink-faint">{item.meaning}</p>
        </div>
        <span className={`chip shrink-0 ${masteryColor(item.mastery)}`}>{item.mastery}</span>
      </button>

      {open ? (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          {item.userSentence ? (
            <Field label="You said" value={item.userSentence} />
          ) : null}
          {item.correctedSentence ? (
            <Field label="Corrected" value={item.correctedSentence} />
          ) : null}
          {item.naturalSentence ? (
            <Field label="Natural" value={item.naturalSentence} />
          ) : null}
          {item.examples.length > 0 ? (
            <Field label="Examples" value={item.examples.join(' · ')} />
          ) : null}

          <div>
            <p className="label mb-1">Meaning</p>
            <textarea
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              className="w-full resize-y rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-faint">
              seen {item.usageCount}× · next due {new Date(item.fsrs.due).toLocaleDateString()}
            </span>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={save}>
                Save
              </button>
              <button
                type="button"
                className="btn-ghost text-red-600"
                onClick={() => onDelete(item.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="text-sm text-ink-soft">{value}</p>
    </div>
  );
}
