import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PreferredLocaleProvider } from '../../../lib/locale/preferred-locale-context';

import { KachufulComputerGame } from './KachufulComputerGame';

function renderGame(): void {
  render(
    <PreferredLocaleProvider initialLocale="en">
      <KachufulComputerGame />
    </PreferredLocaleProvider>,
  );
}

describe('KachufulComputerGame', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.history.pushState({}, '', '/');
  });

  it('renders the localized setup surface', () => {
    renderGame();
    expect(screen.getByRole('heading', { name: /Kachuful \(Judgement\)/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /All games/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: /Start game/i })).toBeEnabled();
    expect(screen.getByText(/How a round works/i)).toBeVisible();
  });

  it('starts a match and shows the round, trump, and a private hand', async () => {
    renderGame();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Start game/i }));

    expect(screen.getByText(/Round 1 of 7/i)).toBeVisible();
    expect(screen.getByText(/Trump: Spades/i)).toBeVisible();
    // The human's seven cards are rendered face-up as accessible images.
    const faces = screen.getAllByRole('img', { name: /of (Clubs|Diamonds|Hearts|Spades)/i });
    expect(faces.length).toBeGreaterThanOrEqual(7);
    // A single live status region drives the turn announcement.
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('never freezes when a bot wins a trick and must lead the next one', () => {
    // A `?seed=` makes the deal deterministic and puts the bots on `hard` (no
    // random mistakes), so this drives one fixed match end to end. Under the old
    // name-keyed bot-step effect, the moment a bot took a trick and had to lead
    // again its display name was unchanged, the effect never re-fired, and the
    // table locked up with an empty trick — never reaching the result overlay.
    window.history.pushState({}, '', '/?seed=7');
    vi.useFakeTimers();
    renderGame();
    fireEvent.click(screen.getByRole('button', { name: /Start game/i }));

    // Answer whatever the human is being asked for this frame; return whether we
    // acted so the loop knows a bot turn still needs another timer tick.
    const answerHumanPrompt = (): boolean => {
      const nextRound = screen.queryByRole('button', { name: /Deal next round/i });
      if (nextRound) {
        fireEvent.click(nextRound);
        return true;
      }
      const bid = screen
        .queryAllByRole('button', { name: /^Bid \d+$/i })
        .find((button) => !(button as HTMLButtonElement).disabled);
      if (bid) {
        fireEvent.click(bid);
        return true;
      }
      const card = screen
        .queryAllByRole('button', { name: /^Play / })
        .find(
          (button) =>
            !(button as HTMLButtonElement).disabled &&
            button.getAttribute('data-playable') === 'true',
        );
      if (card) {
        fireEvent.click(card);
        return true;
      }
      return false;
    };

    let reachedResult = false;
    for (let step = 0; step < 4000; step += 1) {
      if (screen.queryByRole('button', { name: /Play again/i })) {
        reachedResult = true;
        break;
      }
      act(() => {
        vi.advanceTimersByTime(700);
      });
      answerHumanPrompt();
    }

    expect(reachedResult).toBe(true);
  });

  it('exposes the table size and difficulty controls under customize', async () => {
    renderGame();
    const user = userEvent.setup();
    await user.click(screen.getByText(/Customize table/i));

    const sizes = screen.getByLabelText(/Table size/i);
    expect(within(sizes).getByRole('button', { name: /7 players/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hard/i })).toBeInTheDocument();
  });
});
