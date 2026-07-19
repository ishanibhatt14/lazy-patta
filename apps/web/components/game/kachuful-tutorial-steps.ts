import type { TutorialStep } from './HowToPlayTutorial';

/**
 * Kachuful's "How to play" content for the shared HowToPlayTutorial shell.
 * Reuses the game-overview copy keys so there is a single source of truth for
 * the bidding / trump / exact-tricks explanation across the site.
 */
export const KACHUFUL_TUTORIAL_STEPS: readonly TutorialStep[] = [
  { icon: '🃏', titleKey: 'games.kachuful.howTitle', bodyKey: 'games.kachuful.howBody' },
  { icon: '🎯', titleKey: 'games.kachuful.biddingTitle', bodyKey: 'games.kachuful.biddingBody' },
  { icon: '🏆', titleKey: 'games.kachuful.scoringTitle', bodyKey: 'games.kachuful.scoringBody' },
];
