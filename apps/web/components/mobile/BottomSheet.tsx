'use client';

import { useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react';

/**
 * Accessible bottom sheet: a modal dialog that slides up from the bottom edge —
 * the natural pattern for one-handed phone use. Owns the modal concerns so no
 * caller reimplements them: labelled `role="dialog"` + `aria-modal`, Escape and
 * backdrop-tap to close, body-scroll lock while open, and focus moved into the
 * sheet on open and restored to the trigger on close.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
}): ReactElement | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label={title}
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default bg-black/50"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-x border-t border-action-secondary/30 bg-surface-primary p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl focus:outline-none"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-action-secondary/40" aria-hidden />
        <h2 id={titleId} className="text-xl font-black text-action-primary">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
