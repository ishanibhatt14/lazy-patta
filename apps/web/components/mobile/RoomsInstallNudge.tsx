'use client';

import type { ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';

import { InstallHomeCard } from './InstallHomeCard';

/**
 * The install invitation, offered on the family-rooms hub. Reaching this screen
 * means the player is about to create or join a real room — exactly the flow
 * that would otherwise open as a browser tab — so the prompt is genuinely
 * earned here (`engaged`). It still renders nothing until the platform can
 * offer an install and until the player hasn't dismissed it; see
 * [[install-prompt]] for the policy.
 */
export function RoomsInstallNudge(): ReactElement | null {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);
  return <InstallHomeCard t={t} engaged className="w-full max-w-sm" />;
}
