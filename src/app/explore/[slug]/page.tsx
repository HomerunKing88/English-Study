'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader, Loading, EmptyState } from '@/components/ui';
import { getConcept, getStaticConcept, toggleSavedForReview } from '@/lib/concepts';
import type { Concept } from '@/lib/types';

type Tier = 'easy' | 'standard' | 'professional';

export default function ConceptPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [concept, setConcept] = useState<Concept | null | undefined>(undefined);
  const [tier, setTier] = useState<Tier>('easy');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    getConcept(slug).then((c) => {
      if (live) setConcept(c ?? null);
    });
    return () => {
      live = false;
    };
  }, [slug]);

  async function onToggleSave() {
    if (!concept) return;
    setSaving(true);
    const nextSaved = await toggleSavedForReview(concept.slug);
    setConcept({ ...concept, savedForReview: nextSaved });
    setSaving(false);
  }

  if (concept === undefined) return <Loading />;
  if (concept === null) {
    return (
      <div>
        <PageHeader title="Not found" />
        <EmptyState title="That concept doesn't exist." />
        <Link href="/explore" className="btn-ghost mt-4 inline-flex">
          ← Back to Explore
        </Link>
      </div>
    );
  }

  const def =
    tier === 'easy'
      ? concept.easyDef
      : tier === 'standard'
        ? concept.standardDef
        : concept.professionalDef;

  return (
    <div>
      <Link href="/explore" className="mb-3 inline-block text-sm text-ink-faint hover:text-ink">
        ← Explore
      </Link>
      <PageHeader
        title={concept.term}
        subtitle={concept.category}
        action={
          <button
            type="button"
            className={concept.savedForReview ? 'btn-ghost' : 'btn-accent'}
            onClick={onToggleSave}
            disabled={saving}
          >
            {concept.savedForReview ? '★ Saved' : '☆ Save to review'}
          </button>
        }
      />

      <div className="mb-3 flex gap-2">
        {(['easy', 'standard', 'professional'] as Tier[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTier(t)}
            className={`btn-ghost flex-1 capitalize ${t === tier ? 'border-accent bg-accent-soft' : ''}`}
          >
            {t}
          </button>
        ))}
      </div>

      <section className="card mb-4">
        <p className="text-lg leading-relaxed">{def}</p>
      </section>

      {concept.examples.length > 0 ? (
        <Section title="Examples">
          <ul className="space-y-2">
            {concept.examples.map((e, i) => (
              <li key={i} className="text-ink-soft">
                “{e}”
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {concept.collocations.length > 0 ? (
        <Section title="Collocations">
          <div className="flex flex-wrap gap-2">
            {concept.collocations.map((c) => (
              <span key={c} className="chip">
                {c}
              </span>
            ))}
          </div>
        </Section>
      ) : null}

      {concept.compare.length > 0 ? (
        <Section title="Compare">
          <ul className="space-y-2">
            {concept.compare.map((c, i) => (
              <li key={i} className="text-sm text-ink-soft">
                <strong>{c.term}:</strong> {c.distinction}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {concept.commonMistakes.length > 0 ? (
        <Section title="Common mistakes">
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
            {concept.commonMistakes.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {concept.related.length > 0 ? (
        <Section title="Related">
          <div className="flex flex-wrap gap-2">
            {concept.related.map((slug) => {
              const r = getStaticConcept(slug);
              return (
                <Link key={slug} href={`/explore/${slug}`} className="chip hover:border-accent">
                  {r?.term ?? slug} →
                </Link>
              );
            })}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card mb-4">
      <p className="label mb-2">{title}</p>
      {children}
    </section>
  );
}
