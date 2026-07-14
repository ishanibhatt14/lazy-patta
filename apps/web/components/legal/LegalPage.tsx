import type { ReactElement, ReactNode } from 'react';

/**
 * Shared shell for the static legal/support pages (privacy, terms, support,
 * delete-account). Keeps them visually consistent and centred without pulling in
 * a heavier CMS. Content is authored in English; localized versions are a
 * documented follow-up (see docs/domain-migration-checklist.md).
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  readonly title: string;
  readonly updated?: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-action-primary">{title}</h1>
        {updated ? <p className="text-sm text-text-primary/70">Last updated: {updated}</p> : null}
      </header>
      <div className="flex flex-col gap-4 text-base leading-7 text-text-primary">{children}</div>
    </main>
  );
}
