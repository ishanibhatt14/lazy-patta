'use client';

import type { ReactElement } from 'react';
import { useEffect, useReducer } from 'react';

import { computerGameController } from '../../lib/computer-game/controller';
import type { ComputerGameIntent, ComputerGameViewState } from '../../lib/computer-game/types';

import { ComputerGameSetup } from './ComputerGameSetup';
import { GameStatusPanel } from './GameStatusPanel';
import { GameTable } from './GameTable';

function reducer(state: ComputerGameViewState, intent: ComputerGameIntent): ComputerGameViewState {
  return computerGameController.dispatch(state, intent);
}

export function ComputerGameExperience(): ReactElement {
  const [state, dispatch] = useReducer(reducer, computerGameController.initialState);

  useEffect(() => {
    if (state.settings.reducedMotion) {
      return;
    }

    if (state.phase === 'dealing' || state.phase === 'initialPairs') {
      const timeout = window.setTimeout(() => dispatch({ type: 'advance' }), 1200);
      return () => window.clearTimeout(timeout);
    }
  }, [state.phase, state.settings.reducedMotion]);

  useEffect(() => {
    if (state.phase !== 'setup') {
      window.scrollTo({ top: 0, behavior: state.settings.reducedMotion ? 'auto' : 'smooth' });
    }
  }, [state.phase, state.settings.reducedMotion]);

  if (state.phase === 'setup') {
    return (
      <ComputerGameSetup
        state={state}
        onPlayerCountChange={(playerCount) => dispatch({ type: 'setPlayerCount', playerCount })}
        onStart={() => dispatch({ type: 'start' })}
      />
    );
  }

  return (
    <main
      className="flex min-h-screen flex-col gap-4 px-3 py-4 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:px-6"
      data-reduced-motion={state.settings.reducedMotion ? 'true' : 'false'}
    >
      <GameTable
        state={state}
        onAdvance={() => dispatch({ type: 'advance' })}
        onChooseCard={(positionToken) => dispatch({ type: 'chooseHiddenCard', positionToken })}
        onRematch={() => dispatch({ type: 'rematch' })}
      />
      <GameStatusPanel
        state={state}
        onToggleSound={() => dispatch({ type: 'toggleSound' })}
        onToggleReducedMotion={() => dispatch({ type: 'toggleReducedMotion' })}
      />
    </main>
  );
}
