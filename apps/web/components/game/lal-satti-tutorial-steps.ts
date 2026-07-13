import type { TutorialStep } from './HowToPlayTutorial';

/** Lal Satti's "How to play" content, for the shared HowToPlayTutorial shell. */
export const LAL_SATTI_TUTORIAL_STEPS: readonly TutorialStep[] = [
  { icon: '7️⃣', titleKey: 'lalSattiTutorial.sevensTitle', bodyKey: 'lalSattiTutorial.sevensBody' },
  {
    icon: '🔗',
    titleKey: 'lalSattiTutorial.sequenceTitle',
    bodyKey: 'lalSattiTutorial.sequenceBody',
  },
  { icon: '🏁', titleKey: 'lalSattiTutorial.winTitle', bodyKey: 'lalSattiTutorial.winBody' },
];
