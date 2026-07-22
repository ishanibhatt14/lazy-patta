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
  playerCount,
  nameFor,
  t,
}: {
  readonly gameSlug: GameSlug;
  readonly gameName: string;
  readonly result: OnlineResult;
  readonly playerCount: number;
  readonly nameFor: (playerId: string) => string;
  readonly t: Translator;
}): ShareableGameResult {
  const winnerDisplayName = winnerName(result, nameFor);
  return {
    gameSlug,
    gameName,
    headline: winnerDisplayName
      ? t.format('results.headlineWithWinner', { name: winnerDisplayName, game: gameName })
      : t.format('results.headlineGeneric', { game: gameName }),
    ...(winnerDisplayName ? { winnerDisplayName } : {}),
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
