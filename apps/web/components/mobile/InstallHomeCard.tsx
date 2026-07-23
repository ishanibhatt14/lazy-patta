'use client';

import type { ReactElement } from 'react';

import type { Translator } from '../../lib/i18n';
import { useInstallPrompt } from '../../lib/mobile/install-prompt';

/**
 * The "add to home screen" invitation. Renders nothing until the platform can
 * offer an install AND the player has actually played, so a first-time visitor
 * is never nagged. Two shapes: on Android/desktop we trigger the native install
 * prompt on tap; on iOS Safari (which never fires `beforeinstallprompt`) we show
 * the manual Share -> "Add to Home Screen" step instead of a dead button. See
 * [[install-prompt]] for the earned-prompt policy.
 */
export function InstallHomeCard({
  t,
  engaged,
  className,
}: {
  readonly t: Translator;
  readonly engaged: boolean;
  readonly className?: string;
}): ReactElement | null {
  const install = useInstallPrompt(engaged);
  if (install.mode === null) return null;

  const isIos = install.mode === 'ios';

  return (
    <section
      className={`flex items-center justify-between gap-3 rounded-2xl border border-action-secondary/25 bg-surface-primary px-5 py-4 shadow-sm${className ? ` ${className}` : ''}`}
    >
      <div className="flex flex-col gap-1">
        <span className="text-base font-black text-action-primary">
          {t.t('mobile.install.title')}
        </span>
        <span className="text-sm text-text-primary/80">
          {isIos ? t.t('mobile.install.iosStep') : t.t('mobile.install.body')}
        </span>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {!isIos && (
          <button
            type="button"
            onClick={() => void install.promptInstall()}
            className="rounded-full bg-action-primary px-4 py-2 text-sm font-black text-text-onBrand transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t.t('mobile.install.cta')}
          </button>
        )}
        <button
          type="button"
          onClick={install.dismiss}
          className="text-xs font-semibold text-text-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {t.t('mobile.install.dismiss')}
        </button>
      </div>
    </section>
  );
}
