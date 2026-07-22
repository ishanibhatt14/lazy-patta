'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { clearActiveSession, rememberActiveSession } from '../../lib/mobile/active-session';
import { computerGameSessions, type ComputerGameSession } from '../../lib/mobile/computer-session';
import { hasSeenFirstGame, markFirstGameSeen } from '../../lib/mobile/first-game';
import { findGameDefinition, type GameSlug } from '../../lib/mobile/game-registry';
import { JhabbuComputerGame } from '../../src/features/jhabbu/JhabbuComputerGame';
import { KachufulComputerGame } from '../../src/features/kachuful/KachufulComputerGame';
import { LalSattiComputerGame } from '../../src/features/lal-satti/LalSattiComputerGame';
import { Button } from '../Button';
import { ComputerGameExperience } from '../game/ComputerGameExperience';
import {
  GADHA_CHOR_TUTORIAL_STEPS,
  HowToPlayTutorial,
  type TutorialStep,
} from '../game/HowToPlayTutorial';
import { JHABBU_TUTORIAL_STEPS } from '../game/jhabbu-tutorial-steps';
import { KACHUFUL_TUTORIAL_STEPS } from '../game/kachuful-tutorial-steps';
import { LAL_SATTI_TUTORIAL_STEPS } from '../game/lal-satti-tutorial-steps';

const TUTORIAL_STEPS: Record<GameSlug, readonly TutorialStep[]> = {
  'gadha-chor': GADHA_CHOR_TUTORIAL_STEPS,
  'lal-satti': LAL_SATTI_TUTORIAL_STEPS,
  jhabbu: JHABBU_TUTORIAL_STEPS,
  kachuful: KACHUFUL_TUTORIAL_STEPS,
};

export function MobileComputerGameRoute({
  gameSlug,
  sessionId,
}: {
  readonly gameSlug: string;
  readonly sessionId: string;
}): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);
  const [session, setSession] = useState<ComputerGameSession | null | undefined>(undefined);
  const [showTutorial, setShowTutorial] = useState(false);
  const game = findGameDefinition(gameSlug);

  useEffect(() => {
    let cancelled = false;
    void computerGameSessions.load(sessionId).then((loaded) => {
      if (cancelled) return;
      setSession(loaded);
      // Point Home's "Continue" at this table while it's live; a missing or
      // finished session must not linger as a resume target.
      if (loaded && loaded.status !== 'abandoned') {
        rememberActiveSession({ gameSlug: loaded.gameSlug, sessionId: loaded.sessionId });
      } else {
        clearActiveSession();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Guard against an accidental swipe-back / reload mid-game losing the table.
  const inProgress = session != null && session.status !== 'abandoned';
  useEffect(() => {
    if (!inProgress || typeof window === 'undefined') return;
    const warn = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [inProgress]);

  // The first time a player opens a given game, walk them through it once.
  const liveSlug = inProgress && session ? session.gameSlug : null;
  useEffect(() => {
    if (liveSlug && !hasSeenFirstGame(liveSlug)) setShowTutorial(true);
  }, [liveSlug]);

  if (!game || (session && session.gameSlug !== game.slug)) {
    return <RecoveryState message={t.t('mobile.restore.failed')} />;
  }

  if (session === undefined) {
    return (
      <main className="grid min-h-[calc(100dvh-7rem)] place-items-center text-center">
        <p role="status" className="rounded-2xl bg-surface-primary p-5 text-sm text-text-primary">
          {t.t('rooms.waitingToStart')}
        </p>
      </main>
    );
  }

  if (session === null) {
    return <RecoveryState message={t.t('mobile.restore.failed')} />;
  }

  const props = { initialConfig: session.config, autoStart: true };
  const liveGameSlug = session.gameSlug;
  const gameNode =
    liveGameSlug === 'gadha-chor' ? (
      <ComputerGameExperience {...props} />
    ) : liveGameSlug === 'lal-satti' ? (
      <LalSattiComputerGame {...props} />
    ) : liveGameSlug === 'jhabbu' ? (
      <JhabbuComputerGame {...props} />
    ) : (
      <KachufulComputerGame {...props} />
    );

  return (
    <>
      {gameNode}
      {showTutorial ? (
        <HowToPlayTutorial
          locale={locale}
          steps={TUTORIAL_STEPS[liveGameSlug]}
          onClose={() => {
            markFirstGameSeen(liveGameSlug);
            setShowTutorial(false);
          }}
        />
      ) : null}
    </>
  );
}

function RecoveryState({ message }: { readonly message: string }): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);
  return (
    <main className="grid min-h-[calc(100dvh-7rem)] place-items-center text-center">
      <section className="grid gap-3 rounded-2xl bg-surface-primary p-5 shadow-sm">
        <h1 className="text-xl font-black text-action-primary">{message}</h1>
        <div className="grid gap-2">
          <Link
            href="/mobile"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-action-primary px-5 py-2.5 font-semibold text-text-onBrand"
          >
            {t.t('action.returnHome')}
          </Link>
          <Button variant="ghost" onClick={() => history.back()}>
            {t.t('action.tryAgain')}
          </Button>
        </div>
      </section>
    </main>
  );
}
