import type { Card, Rank, Suit } from '@lazy-patta/game-contracts';
import { cardId } from '@lazy-patta/game-contracts';
import {
  DEFAULT_LOCALE,
  formatMessage,
  getMessages,
  type MessageKey,
} from '@lazy-patta/localization';
import type { ReactElement, ReactNode } from 'react';

import { Button } from '../../components/Button';
import { PlayerSeat } from '../../components/PlayerSeat';
import { PlayingCard } from '../../components/PlayingCard';
import { ResultCard } from '../../components/ResultCard';
import { RoomCard } from '../../components/RoomCard';

const t = getMessages(DEFAULT_LOCALE);

function mkCard(suit: Suit, rank: Rank): Card {
  return { id: cardId(suit, rank), suit, rank };
}

/** Localized accessible name for a card, e.g. "Ace Hearts". */
function cardLabel(card: Card): string {
  const rank = t[`rank.${card.rank}` as MessageKey];
  const suit = t[`suit.${card.suit}` as MessageKey];
  return `${rank} ${suit}`;
}

function Section({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-action-primary">{title}</h2>
      <div className="flex flex-wrap items-end gap-4 rounded-lg bg-game-table p-6">{children}</div>
    </section>
  );
}

const HAND: readonly Card[] = [
  mkCard('hearts', 'ace'),
  mkCard('spades', 'king'),
  mkCard('diamonds', 'queen'),
  mkCard('clubs', 'jack'),
  mkCard('hearts', '7'),
];

export default function GalleryPage(): ReactElement {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-12 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-action-primary">Component Gallery</h1>
        <p className="text-base text-text-primary">
          {t['app.name']} design-system primitives — every color comes from a semantic token, so a
          theme swap restyles the whole set. Reference only; not shipped UI.
        </p>
      </header>

      <Section title="Buttons">
        <Button variant="primary">{t['action.getStarted']}</Button>
        <Button variant="secondary">{t['action.playComputer']}</Button>
        <Button variant="ghost">{t['action.passAndPlay']}</Button>
        <Button variant="primary" size="sm">
          {t['action.joinRoom']}
        </Button>
        <Button variant="primary" size="lg">
          {t['action.createRoom']}
        </Button>
        <Button variant="primary" disabled>
          {t['action.playAsGuest']}
        </Button>
      </Section>

      <Section title="Playing cards">
        {HAND.map((card) => (
          <PlayingCard key={card.id} card={card} label={cardLabel(card)} />
        ))}
        <PlayingCard faceDown />
        <PlayingCard card={mkCard('spades', 'ace')} size="sm" label={cardLabel(mkCard('spades', 'ace'))} />
        <PlayingCard card={mkCard('diamonds', '10')} size="lg" label={cardLabel(mkCard('diamonds', '10'))} />
      </Section>

      <Section title="Player seats">
        <PlayerSeat name="Asha" avatarInitial="A" isActive statusLabel={t['turn.yours']} />
        <PlayerSeat
          name="Ravi"
          avatarInitial="R"
          statusLabel={formatMessage(DEFAULT_LOCALE, 'turn.waiting', { name: 'Asha' })}
        />
        <PlayerSeat name="Meera" avatarInitial="M" />
        <PlayerSeat name="Dev" avatarInitial="D" isGadhaChor badgeLabel={t['label.gadhaChor']} />
      </Section>

      <Section title="Room cards">
        <RoomCard
          name="Sharma Family"
          hostLabel={formatMessage(DEFAULT_LOCALE, 'lobby.hostedBy', { name: 'Asha' })}
          playersLabel={formatMessage(DEFAULT_LOCALE, 'lobby.playerCount', { count: 3 })}
          joinLabel={t['action.joinRoom']}
        />
        <RoomCard
          name="Weekend Adda"
          hostLabel={formatMessage(DEFAULT_LOCALE, 'lobby.hostedBy', { name: 'Ravi' })}
          playersLabel={formatMessage(DEFAULT_LOCALE, 'lobby.playerCount', { count: 1 })}
          joinLabel={t['action.joinRoom']}
        />
        <RoomCard
          name="Full House"
          hostLabel={formatMessage(DEFAULT_LOCALE, 'lobby.hostedBy', { name: 'Meera' })}
          playersLabel={formatMessage(DEFAULT_LOCALE, 'lobby.playerCount', { count: 4 })}
          joinLabel={t['action.joinRoom']}
          isJoinable={false}
        />
      </Section>

      <Section title="Result card">
        <ResultCard
          winnerLabel={formatMessage(DEFAULT_LOCALE, 'result.winner', { name: 'Ravi' })}
          gadhaChorLabel={formatMessage(DEFAULT_LOCALE, 'result.gadhaChor', { name: 'Dev' })}
          rematchLabel={t['action.rematch']}
          exitLabel={t['action.exit']}
        />
      </Section>
    </main>
  );
}
