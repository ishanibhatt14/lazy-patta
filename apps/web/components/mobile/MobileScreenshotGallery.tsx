'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

import type { Translator } from '../../lib/i18n';
import { MOBILE_SCREENSHOTS } from '../../lib/mobile/screenshots';

// The featured banner spans the column; the thumbnails sit two/three across on
// wider viewports and scroll as a filmstrip on phones.
const FEATURED_SIZES = '(max-width: 767px) 92vw, 640px';
const THUMB_SIZES = '(max-width: 639px) 72vw, (max-width: 1023px) 45vw, 30vw';

const featured = MOBILE_SCREENSHOTS.find((shot) => shot.featured) ?? MOBILE_SCREENSHOTS[0];
const thumbs = MOBILE_SCREENSHOTS.filter((shot) => shot !== featured);
// The lightbox indexes into this ordering: featured first, then the thumbs.
const ORDERED = [featured, ...thumbs];

export function MobileScreenshotGallery({ t }: { readonly t: Translator }): ReactElement {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Remember which trigger opened the lightbox so focus returns there on close.
  const triggersRef = useRef<(HTMLButtonElement | null)[]>([]);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const handleClose = useCallback(() => {
    if (openIndex !== null) triggersRef.current[openIndex]?.focus();
    setOpenIndex(null);
  }, [openIndex]);

  useEffect(() => {
    if (openIndex === null) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openIndex, handleClose]);

  const openShot = openIndex === null ? null : ORDERED[openIndex];

  return (
    <section aria-labelledby="mobile-gallery-heading" className="flex flex-col gap-4">
      <h2 id="mobile-gallery-heading" className="text-xl font-black text-action-primary">
        {t.t('mobile.gallery.heading')}
      </h2>

      {/* Featured: the live game table, the one shot that shows real play. Eager
          because it is the section's anchor and usually above the fold. */}
      <button
        ref={(node) => {
          triggersRef.current[0] = node;
        }}
        type="button"
        onClick={() => setOpenIndex(0)}
        aria-label={t.t(featured.altKey)}
        aria-haspopup="dialog"
        className="group flex flex-col gap-2 rounded-3xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
      >
        <span
          className="relative block w-full overflow-hidden rounded-3xl border border-action-secondary/25 bg-surface-primary shadow-md transition group-active:scale-[0.99]"
          style={{ aspectRatio: `${featured.width} / ${featured.height}` }}
        >
          <Image
            src={featured.path}
            alt={t.t(featured.altKey)}
            fill
            priority
            loading="eager"
            sizes={FEATURED_SIZES}
            className="object-cover"
          />
        </span>
        <span className="text-sm font-bold text-text-primary/80">{t.t(featured.captionKey)}</span>
      </button>

      {/* The remaining four: a snap filmstrip on phones, a grid on desktop. */}
      <ul
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4"
        role="list"
      >
        {thumbs.map((shot, thumbIndex) => {
          const index = thumbIndex + 1;
          return (
            <li key={shot.path} className="w-[72%] shrink-0 snap-start sm:w-auto sm:shrink">
              <button
                ref={(node) => {
                  triggersRef.current[index] = node;
                }}
                type="button"
                onClick={() => setOpenIndex(index)}
                aria-label={t.t(shot.altKey)}
                aria-haspopup="dialog"
                className="group flex w-full flex-col gap-2 rounded-2xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
              >
                <span
                  className="relative block w-full overflow-hidden rounded-2xl border border-action-secondary/25 bg-surface-primary shadow-sm transition group-active:scale-[0.99]"
                  style={{ aspectRatio: `${shot.width} / ${shot.height}` }}
                >
                  <Image
                    src={shot.path}
                    alt={t.t(shot.altKey)}
                    fill
                    loading="lazy"
                    sizes={THUMB_SIZES}
                    className="object-cover"
                  />
                </span>
                <span className="text-sm font-bold text-text-primary/80">
                  {t.t(shot.captionKey)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {openShot ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.t(openShot.altKey)}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 p-4 backdrop-blur-sm"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl font-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            aria-label={t.t('action.close')}
          >
            ×
          </button>
          <Image
            src={openShot.path}
            alt={t.t(openShot.altKey)}
            width={openShot.width}
            height={openShot.height}
            sizes="90vw"
            onClick={(event) => event.stopPropagation()}
            className="h-auto max-h-[82vh] w-auto max-w-[92vw] rounded-2xl object-contain shadow-2xl"
          />
          <p className="text-sm font-semibold text-white/90">{t.t(openShot.captionKey)}</p>
        </div>
      ) : null}
    </section>
  );
}
