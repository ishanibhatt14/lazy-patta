import { seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import {
  createKachufulController,
  selectKachufulViewState,
  type KachufulController,
} from './controller';
import type { KachufulControllerState } from './types';

function startedController(seed = 2) {
  const controller = createKachufulController(seededRng(seed));
  const named = controller.dispatch(controller.initialState, {
    type: 'setHumanName',
    humanName: 'Isha',
  });
  const state = controller.dispatch(named, { type: 'start' });
  return { controller, state };
}

/** Auto-play with the deterministic bot until a condition, or the match ends. */
function driveUntil(
  controller: KachufulController,
  start: KachufulControllerState,
  stop: (state: KachufulControllerState) => boolean,
): KachufulControllerState {
  let current = start;
  for (let step = 0; step < 6000; step += 1) {
    if (stop(current)) return current;
    const view = selectKachufulViewState(current);
    if (view.phase === 'result') return current;
    if (view.phase === 'roundScored') {
      current = controller.dispatch(current, { type: 'nextRound' });
    } else if (view.isHumanTurn && view.phase === 'bidding') {
      current = controller.dispatch(current, { type: 'placeBid', bid: view.legalBids[0]! });
    } else if (view.isHumanTurn && view.phase === 'playing') {
      current = controller.dispatch(current, {
        type: 'playCard',
        cardId: view.playableCardIds[0]!,
      });
    } else {
      current = controller.dispatch(current, { type: 'botStep' });
    }
  }
  throw new Error('DID_NOT_STOP');
}

describe('Kachuful web controller', () => {
  it('starts a game in the bidding phase with a private human hand', () => {
    const { state } = startedController();
    const view = selectKachufulViewState(state);
    expect(view.phase).toBe('bidding');
    expect(view.ownHand).toHaveLength(7);
    expect(view.roundNumber).toBe(1);
    expect(view.totalRounds).toBe(7);
    expect(view.trump).toBe('spades');
    expect(view.seats).toHaveLength(4);
    expect(view.seats.some((seat) => seat.isDealer)).toBe(true);
  });

  it('ignores a human bid when it is not the human turn', () => {
    const { controller, state } = startedController();
    const view = selectKachufulViewState(state);
    if (!view.isHumanTurn) {
      const next = controller.dispatch(state, { type: 'placeBid', bid: 0 });
      expect(next).toBe(state);
    }
  });

  it('lets the human bid on their turn and moves the turn along', () => {
    const { controller, state } = startedController(4);
    const atHumanBid = driveUntil(
      controller,
      state,
      (s) =>
        selectKachufulViewState(s).isHumanTurn && selectKachufulViewState(s).phase === 'bidding',
    );
    const view = selectKachufulViewState(atHumanBid);
    expect(view.isHumanTurn).toBe(true);
    const next = controller.dispatch(atHumanBid, { type: 'placeBid', bid: view.legalBids[0]! });
    const nextView = selectKachufulViewState(next);
    // Either the turn advanced to someone else, or bidding finished and play began.
    expect(nextView.isHumanTurn && nextView.phase === 'bidding').toBe(false);
  });

  it('surfaces the hook rule as a forbidden bid for the human dealer', () => {
    // Search seeds for a start where the human is the dealer (last bidder).
    for (let seed = 1; seed < 40; seed += 1) {
      const controller = createKachufulController(seededRng(seed));
      const state = controller.dispatch(controller.initialState, { type: 'start' });
      const dealerLast = driveUntil(controller, state, (s) => {
        const v = selectKachufulViewState(s);
        return (
          v.phase === 'bidding' &&
          v.isHumanTurn &&
          v.seats.filter((seat) => seat.bid !== null).length === v.seats.length - 1
        );
      });
      const view = selectKachufulViewState(dealerLast);
      if (view.forbiddenBid !== null) {
        expect(view.legalBids).not.toContain(view.forbiddenBid);
        return;
      }
    }
    throw new Error('NO_DEALER_HOOK_CASE_FOUND');
  });

  it('plays a full 7-round match to a result with a scoreboard', () => {
    const { controller, state } = startedController(9);
    const final = driveUntil(controller, state, (s) => s.phase === 'result');
    const view = selectKachufulViewState(final);
    expect(view.phase).toBe('result');
    expect(view.result).not.toBeNull();
    expect(view.result!.scoreboard).toHaveLength(4);
    expect(view.result!.winnerNames.length).toBeGreaterThanOrEqual(1);
    // Scoreboard is sorted high-to-low.
    const totals = view.result!.scoreboard.map((row) => row.totalScore);
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
  });

  it('supports a rematch from the result screen', () => {
    const { controller, state } = startedController(9);
    const final = driveUntil(controller, state, (s) => s.phase === 'result');
    const again = controller.dispatch(final, { type: 'rematch' });
    const view = selectKachufulViewState(again);
    expect(view.phase).toBe('bidding');
    expect(view.roundNumber).toBe(1);
  });
});
