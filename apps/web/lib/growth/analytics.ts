import type { GameSlug } from '../game-discovery';

export type ShareMethod = 'native' | 'whatsapp' | 'copy-link' | 'copy-code';

export type GrowthEvent =
  | { readonly name: 'mobile_home_viewed' }
  | { readonly name: 'game_selected'; readonly gameSlug: GameSlug }
  | { readonly name: 'family_hub_viewed'; readonly familyCount: number }
  | { readonly name: 'family_detail_viewed'; readonly favoriteCount: number }
  | { readonly name: 'family_game_night_scheduled'; readonly gameSlug?: GameSlug }
  | { readonly name: 'family_game_night_reminder_saved'; readonly gameSlug?: GameSlug }
  | { readonly name: 'family_group_create_started' }
  | { readonly name: 'family_group_created' }
  | { readonly name: 'family_group_join_started' }
  | { readonly name: 'family_group_joined' }
  | { readonly name: 'family_room_create_started'; readonly gameSlug: GameSlug }
  | {
      readonly name: 'family_room_created';
      readonly gameSlug: GameSlug;
      readonly playerCapacity: number;
    }
  | { readonly name: 'invite_button_clicked'; readonly gameSlug?: GameSlug }
  | { readonly name: 'invite_shared'; readonly gameSlug?: GameSlug; readonly method: ShareMethod }
  | { readonly name: 'invite_opened'; readonly gameSlug?: GameSlug }
  | { readonly name: 'room_join_started'; readonly gameSlug?: GameSlug }
  | { readonly name: 'room_joined'; readonly gameSlug: GameSlug }
  | { readonly name: 'lobby_viewed'; readonly gameSlug: GameSlug; readonly playerCount: number }
  | {
      readonly name: 'minimum_players_reached';
      readonly gameSlug: GameSlug;
      readonly playerCount: number;
    }
  | {
      readonly name: 'game_start_clicked';
      readonly gameSlug: GameSlug;
      readonly playerCount: number;
    }
  | {
      readonly name: 'game_start_succeeded';
      readonly gameSlug: GameSlug;
      readonly playerCount: number;
    }
  | { readonly name: 'game_start_failed'; readonly gameSlug?: GameSlug; readonly code: string }
  | {
      readonly name: 'multiplayer_game_started';
      readonly gameSlug: GameSlug;
      readonly playerCount: number;
    }
  | {
      readonly name: 'family_multiplayer_game_completed';
      readonly gameSlug: GameSlug;
      readonly playerCount: number;
      readonly roundDurationSeconds: number;
    }
  | {
      readonly name: 'round_completed';
      readonly gameSlug: GameSlug;
      readonly playerCount: number;
      readonly roundNumber: number;
    }
  | {
      readonly name: 'rematch_panel_viewed';
      readonly gameSlug: GameSlug;
      readonly playerCount: number;
    }
  | { readonly name: 'rematch_vote_submitted'; readonly gameSlug: GameSlug }
  | { readonly name: 'rematch_started'; readonly gameSlug: GameSlug; readonly playerCount: number }
  | {
      readonly name: 'result_shared';
      readonly gameSlug: GameSlug;
      readonly method: Exclude<ShareMethod, 'copy-code'>;
    };

const FORBIDDEN_KEYS = new Set([
  'roomCode',
  'code',
  'displayName',
  'recipient',
  'token',
  'membershipToken',
  'hand',
  'cards',
]);

export function assertGrowthEventSafe(event: GrowthEvent): void {
  for (const key of Object.keys(event)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`Forbidden growth analytics field: ${key}`);
    }
  }
}

export function trackGrowthEvent(event: GrowthEvent): void {
  try {
    assertGrowthEventSafe(event);
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('lazy-patta:growth-event', { detail: event }));
  } catch {
    // Analytics must never block gameplay.
  }
}
