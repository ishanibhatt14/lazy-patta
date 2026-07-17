/**
 * Shared computer-opponent difficulty vocabulary.
 *
 * Difficulty is modelled as an "epsilon-random" mistake rate applied on top of
 * each game's existing heuristic bot: on any given turn a bot plays the
 * heuristic-best move, except with probability {@link botMistakeRate} it plays a
 * random legal move instead. `hard` never deviates (rate 0) and is therefore
 * fully deterministic — the historical behaviour — so seeded tests and the
 * server-side online authority stay reproducible when no difficulty is passed.
 */
export type BotDifficulty = 'easy' | 'medium' | 'hard';

export const BOT_DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'medium', 'hard'];

const MISTAKE_RATE: Record<BotDifficulty, number> = {
  easy: 0.55,
  medium: 0.2,
  hard: 0,
};

/** Probability in [0, 1) that a bot at this difficulty plays a random legal move. */
export function botMistakeRate(difficulty: BotDifficulty): number {
  return MISTAKE_RATE[difficulty];
}
