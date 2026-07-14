import Link from 'next/link';
import type { ReactElement } from 'react';

import { breadcrumbListJsonLd } from '../../lib/seo/structured-data';

import { JsonLd } from './JsonLd';

export interface BreadcrumbItem {
  readonly label: string;
  /** Locale-prefixed path; the last crumb renders as text but keeps its path for JSON-LD. */
  readonly href: string;
}

export interface BreadcrumbsProps {
  readonly items: readonly BreadcrumbItem[];
  readonly ariaLabel: string;
}

/**
 * Visible breadcrumb trail plus its matching `BreadcrumbList` JSON-LD, driven by
 * a single `items` array so the rendered trail and structured data never drift.
 */
export function Breadcrumbs({ items, ariaLabel }: BreadcrumbsProps): ReactElement {
  return (
    <>
      <JsonLd data={breadcrumbListJsonLd(items.map((i) => ({ name: i.label, path: i.href })))} />
      <nav aria-label={ariaLabel} className="text-sm text-text-primary/80">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-1">
                {isLast ? (
                  <span aria-current="page" className="font-semibold">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="font-semibold text-action-primary hover:underline"
                  >
                    {item.label}
                  </Link>
                )}
                {isLast ? null : <span aria-hidden="true">/</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
