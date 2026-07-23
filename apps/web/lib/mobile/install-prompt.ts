'use client';

import { useEffect, useState } from 'react';

/**
 * A deliberately *earned* install prompt. Browsers fire `beforeinstallprompt`
 * eagerly, but interrupting a first-time visitor with "add to home screen" is
 * the kind of nag this app avoids. We stash the event and only surface the
 * invitation once the player has actually played — and never again once they
 * dismiss it. This is the family-game-night version of PWA install: offered
 * warmly, after the value is felt, and easy to wave away.
 *
 * iOS Safari never fires `beforeinstallprompt`, so iPhone/iPad users would
 * otherwise never learn that the family table can live on their home screen.
 * For them we fall back to a `'ios'` mode that shows the manual Share ->
 * "Add to Home Screen" step. And when the app is already running standalone
 * (installed), we stay silent — it is already "part of the app".
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

/**
 * True when this tab is already an installed, standalone PWA (no browser
 * chrome). Covers the cross-platform `display-mode` media query and the older
 * iOS Safari `navigator.standalone` flag.
 */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return media || iosStandalone;
}

/**
 * True only for a real iOS Safari tab that can Add to Home Screen. In-app and
 * third-party iOS browsers (Chrome/Firefox/Edge) cannot install, so they are
 * excluded to avoid promising a step the user cannot complete.
 */
export function isIosInstallSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIosDevice =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ reports as desktop Safari; a touch-capable Mac is really an iPad.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIosDevice) return false;
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
  return isSafari;
}

export type InstallMode = 'browser' | 'ios';

/**
 * Pure: which install invitation (if any) an engaged, undismissed player should
 * see. `'browser'` when the platform handed us a deferrable prompt; `'ios'` for
 * an iOS Safari tab that must install manually; `null` otherwise — including
 * when the app is already installed (standalone).
 */
export function resolveInstallMode(input: {
  readonly hasPrompt: boolean;
  readonly isIos: boolean;
  readonly isStandalone: boolean;
  readonly engaged: boolean;
  readonly dismissed: boolean;
}): InstallMode | null {
  if (input.isStandalone || input.dismissed || !input.engaged) return null;
  if (input.hasPrompt) return 'browser';
  if (input.isIos) return 'ios';
  return null;
}

export interface InstallPrompt {
  readonly mode: InstallMode | null;
  readonly available: boolean;
  readonly promptInstall: () => Promise<void>;
  readonly dismiss: () => void;
}

export function useInstallPrompt(engaged: boolean): InstallPrompt {
  const [hasPrompt, setHasPrompt] = useState(deferred !== null);
  const [dismissed, setDismissed] = useState(false);
  const [platform, setPlatform] = useState<{ isIos: boolean; isStandalone: boolean }>({
    isIos: false,
    isStandalone: false,
  });

  useEffect(() => {
    setDismissed(wasDismissed());
    setPlatform({ isIos: isIosInstallSafari(), isStandalone: isStandaloneDisplay() });
    const sync = (): void => setHasPrompt(deferred !== null);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  const mode = resolveInstallMode({
    hasPrompt,
    isIos: platform.isIos,
    isStandalone: platform.isStandalone,
    engaged,
    dismissed,
  });

  return {
    mode,
    available: mode !== null,
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
