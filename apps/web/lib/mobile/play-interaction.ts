/**
 * The single decision every immersive game makes when the human taps a card in
 * their hand. Keeping it here — pure and shared — means all four games treat an
 * illegal tap and the optional confirm-before-play step identically, instead of
 * each shell reinventing (and drifting on) the rules.
 *
 * - `ignore`  — not the human's turn; the tap is a no-op.
 * - `invalid` — the card isn't currently playable; surface a gentle hint.
 * - `arm`     — confirm-before-play is on and this is the first tap; wait for a
 *               second tap on the same card before committing.
 * - `commit`  — play the card now.
 */
export type CardTapOutcome =
  | { readonly kind: 'ignore' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'arm'; readonly cardId: string }
  | { readonly kind: 'commit'; readonly cardId: string };

export function resolveCardTap(input: {
  readonly cardId: string;
  readonly isHumanTurn: boolean;
  readonly playableCardIds: readonly string[];
  readonly confirmBeforePlay: boolean;
  readonly armedCardId: string | null;
}): CardTapOutcome {
  if (!input.isHumanTurn) return { kind: 'ignore' };
  if (!input.playableCardIds.includes(input.cardId)) return { kind: 'invalid' };
  if (input.confirmBeforePlay && input.armedCardId !== input.cardId) {
    return { kind: 'arm', cardId: input.cardId };
  }
  return { kind: 'commit', cardId: input.cardId };
}
