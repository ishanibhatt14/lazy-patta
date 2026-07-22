import type { Translator } from '../i18n';

import { trackGrowthEvent } from './analytics';
import { resultShareText, type ShareableGameResult } from './results';

export type ShareOutcome = 'shared' | 'copied' | 'unavailable';

/**
 * The single share path for end-of-game results across every game. Builds the
 * warm, family-friendly share text, hands it to the native share sheet (or the
 * clipboard as a fallback), and records the growth event — but only after the
 * share actually lands, so a cancelled share sheet is not counted. Sharing is a
 * nicety: it never throws over a friendly result screen.
 */
export async function shareGameResult(
  result: ShareableGameResult,
  t: Translator,
): Promise<ShareOutcome> {
  const text = resultShareText(result, t);
  try {
    const nav = navigator as Navigator & { share?: (data: { text: string }) => Promise<void> };
    if (typeof nav.share === 'function') {
      await nav.share({ text });
      trackGrowthEvent({ name: 'result_shared', gameSlug: result.gameSlug, method: 'native' });
      return 'shared';
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      trackGrowthEvent({ name: 'result_shared', gameSlug: result.gameSlug, method: 'copy-link' });
      return 'copied';
    }
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}
