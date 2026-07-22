import type { GameResult } from '@lazy-patta/game-contracts';
import type { JhabbuResult } from '@lazy-patta/jhabbu-engine';
import type { KachufulResult } from '@lazy-patta/kachuful-engine';
import type { LalSattiResult } from '@lazy-patta/lal-satti-engine';

import type { GameSlug } from '../game-discovery';
import type { Translator } from '../i18n';
import { siteConfig } from '../site-config';

export interface ShareableGameResult {
  readonly gameSlug: GameSlug;
  readonly gameName: string;
  readonly headline: string;
  readonly winnerDisplayName?: string;
  readonly roundNumber?: number;
  readonly playerCount: number;
  readonly seriesLeaderDisplayName?: string;
  readonly shareUrl: string;
}

export type OnlineResult = GameResult | LalSattiResult | JhabbuResult | KachufulResult;

export function buildShareableGameResult({
  gameSlug,
  gameName,
  result,
  winnerDisplayName: explicitWinner,
  playerCount,
  roundNumber,
  seriesLeaderDisplayName,
  nameFor,
  t,
}: {
  readonly gameSlug: GameSlug;
  readonly gameName: string;
  /**
   * The raw engine result, used to derive the winner. Online games hold one of
   * these; the per-game result views instead pass `winnerDisplayName` directly.
   */
  readonly result?: OnlineResult;
  /** An already-resolved winner name, preferred over deriving from `result`. */
  readonly winnerDisplayName?: string;
  readonly playerCount: number;
  /** 1-indexed round within the family series, when the game tracks one. */
  readonly roundNumber?: number;
  /** The running series leader, when the game accumulates scores across rounds. */
  readonly seriesLeaderDisplayName?: string;
  readonly nameFor?: (playerId: string) => string;
  readonly t: Translator;
}): ShareableGameResult {
  const winnerDisplayName =
    explicitWinner ?? (result && nameFor ? winnerName(result, nameFor) : undefined);
  return {
    gameSlug,
    gameName,
    headline: winnerDisplayName
      ? t.format('results.headlineWithWinner', { name: winnerDisplayName, game: gameName })
      : t.format('results.headlineGeneric', { game: gameName }),
    ...(winnerDisplayName ? { winnerDisplayName } : {}),
    ...(typeof roundNumber === 'number' ? { roundNumber } : {}),
    ...(seriesLeaderDisplayName ? { seriesLeaderDisplayName } : {}),
    playerCount,
    shareUrl: siteConfig.canonicalOrigin,
  };
}

export function resultShareText(result: ShareableGameResult, t: Translator): string {
  return t.format('results.shareText', {
    headline: result.headline,
    count: result.playerCount,
    url: result.shareUrl,
  });
}

function winnerName(
  result: OnlineResult,
  nameFor: (playerId: string) => string,
): string | undefined {
  if ('winners' in result && result.winners.length > 0) return nameFor(result.winners[0]!);
  if ('winnerIds' in result && result.winnerIds.length > 0) return nameFor(result.winnerIds[0]!);
  if ('winnerId' in result && typeof result.winnerId === 'string') return nameFor(result.winnerId);
  return undefined;
}
