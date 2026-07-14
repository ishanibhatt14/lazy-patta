import type { TutorialStep } from './HowToPlayTutorial';

/**
 * Jhabbu's "How to play" content for the shared HowToPlayTutorial shell.
 * Reuses the game-overview copy keys so there is a single source of truth for
 * the follow-suit / Thulla / get-away explanation across the site.
 */
export const JHABBU_TUTORIAL_STEPS: readonly TutorialStep[] = [
  { icon: '♠️', titleKey: 'games.jhabbu.howTitle', bodyKey: 'games.jhabbu.howBody' },
  { icon: '🔄', titleKey: 'games.jhabbu.thullaTitle', bodyKey: 'games.jhabbu.thullaBody' },
  { icon: '🏁', titleKey: 'games.jhabbu.getawayTitle', bodyKey: 'games.jhabbu.getawayBody' },
];
