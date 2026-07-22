'use client';

import { useEffect, useState } from 'react';

/**
 * A deliberately *earned* install prompt. Browsers fire `beforeinstallprompt`
 * eagerly, but interrupting a first-time visitor with "add to home screen" is
 * the kind of nag this app avoids. We stash the event and only surface the
 * invitation once the player has actually played — and never again once they
 * dismiss it. This is the family-game-night version of PWA install: offered
 * warmly, after the value is felt, and easy to wave away.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'lazy-patta:mobile-install-dismissed:v1';

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Pure: the invitation is only worth showing to an engaged, undismissed player
 * whose browser actually offered an install. */
export function shouldOfferInstall(input: {
  readonly hasPrompt: boolean;
  readonly engaged: boolean;
  readonly dismissed: boolean;
}): boolean {
  return input.hasPrompt && input.engaged && !input.dismissed;
}

export interface InstallPrompt {
  readonly available: boolean;
  readonly promptInstall: () => Promise<void>;
  readonly dismiss: () => void;
}

export function useInstallPrompt(engaged: boolean): InstallPrompt {
  const [hasPrompt, setHasPrompt] = useState(deferred !== null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(wasDismissed());
    const sync = (): void => setHasPrompt(deferred !== null);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  const available = shouldOfferInstall({ hasPrompt, engaged, dismissed });

  return {
    available,
    promptInstall: async () => {
      const event = deferred;
      if (!event) return;
      await event.prompt();
      await event.userChoice;
      deferred = null;
      notify();
    },
    dismiss: () => {
      setDismissed(true);
      try {
        window.localStorage.setItem(DISMISSED_KEY, '1');
      } catch {
        // A remembered dismissal is a nicety; ignore storage failures.
      }
    },
  };
}
