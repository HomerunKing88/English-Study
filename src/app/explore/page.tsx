'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader, Loading } from '@/components/ui';
import { getConcepts, conceptCategories } from '@/lib/concepts';
import type { Concept, ConceptCategory } from '@/lib/types';

export default function ExplorePage() {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ConceptCategory | 'All'>('All');

  useEffect(() => {
    let live = true;
    getConcepts().then((c) => {
      if (!live) return;
      setConcepts(c);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  const categories = useMemo(() => {
    const present = new Set(concepts.map((c) => c.category));
    return conceptCategories().filter((c) => present.has(c));
  }, [concepts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return concepts.filter((c) => {
      if (category !== 'All' && c.category !== category) return false;
      if (!q) return true;
      return (
        c.term.toLowerCase().includes(q) ||
        c.easyDef.toLowerCase().includes(q) ||
        c.collocations.some((x) => x.toLowerCase().includes(q))
      );
    });
  }, [concepts, query, category]);

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Explore"
        subtitle="Finance Academy — browse concepts, save them into review."
      />

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search concepts…"
        className="mb-3 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory('All')}
          className={`chip ${category === 'All' ? 'border-accent bg-accent-soft text-ink' : ''}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`chip ${category === c ? 'border-accent bg-accent-soft text-ink' : ''}`}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {filtered.map((c) => (
          <li key={c.slug}>
            <Link href={`/explore/${c.slug}`} className="card flex items-center justify-between gap-3 hover:bg-paper-soft">
              <div>
                <p className="font-medium">
                  {c.term}
                  {c.savedForReview ? <span className="ml-2 text-accent">★</span> : null}
                </p>
                <p className="mt-0.5 line-clamp-1 text-sm text-ink-faint">{c.easyDef}</p>
              </div>
              <span className="chip shrink-0">{c.category}</span>
            </Link>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="py-10 text-center text-sm text-ink-faint">No concepts match.</li>
        ) : null}
      </ul>
    </div>
  );
}
