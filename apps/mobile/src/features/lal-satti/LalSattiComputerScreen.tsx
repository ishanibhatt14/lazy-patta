import { reactNativeTokens } from '@lazy-patta/design-tokens';
import type { Card, Rank, Rng, Suit } from '@lazy-patta/game-contracts';
import {
  chooseLalSattiBotAction,
  LalSattiEngine,
  toTableauLanes,
} from '@lazy-patta/lal-satti-engine';
import { DEFAULT_LOCALE, formatMessage, getMessages } from '@lazy-patta/localization';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const color = reactNativeTokens.color;
const engine = new LalSattiEngine();
const HUMAN_ID = 'you';
const BOT_IDS = ['ba', 'kaka', 'krina'];
const PLAYER_IDS = [HUMAN_ID, ...BOT_IDS];
const BOT_NAMES: Record<string, string> = {
  ba: 'Ba',
  kaka: 'Kaka',
  krina: 'Krina',
};

function seededRng(seed: number): Rng {
  let value = seed >>> 0;
  return {
    next(): number {
      value = (value + 0x6d2b79f5) | 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

function rankText(rank: Rank): string {
  if (rank === 'jack') return 'J';
  if (rank === 'queen') return 'Q';
  if (rank === 'king') return 'K';
  if (rank === 'ace') return 'A';
  return rank;
}

function suitGlyph(suit: Suit): string {
  if (suit === 'hearts') return '♥';
  if (suit === 'diamonds') return '♦';
  if (suit === 'clubs') return '♣';
  return '♠';
}

function playerName(id: string): string {
  return id === HUMAN_ID ? t['computer.youName'] : (BOT_NAMES[id] ?? id);
}

const t = getMessages(DEFAULT_LOCALE);

function CardTile({
  card,
  playable = false,
}: {
  readonly card: Card;
  readonly playable?: boolean;
}) {
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <View style={[styles.card, playable ? styles.cardPlayable : null]}>
      <Text style={[styles.cardRank, red ? styles.redSuit : styles.blackSuit]}>
        {rankText(card.rank)}
      </Text>
      <Text style={[styles.cardSuit, red ? styles.redSuit : styles.blackSuit]}>
        {suitGlyph(card.suit)}
      </Text>
    </View>
  );
}

export function LalSattiComputerScreen(): ReactElement {
  const rngRef = useRef(seededRng(Date.now()));
  const [game, setGame] = useState(() =>
    engine.init(PLAYER_IDS, rngRef.current, undefined, BOT_IDS),
  );
  const legalActions = useMemo(() => engine.legalActions(game, HUMAN_ID), [game]);
  const playableIds = legalActions
    .filter((action) => action.type === 'PLAY_CARD')
    .map((action) => action.cardId);
  const canPass = legalActions.some((action) => action.type === 'PASS');
  const human = game.players.find((player) => player.id === HUMAN_ID)!;
  const currentPlayer = game.players[game.currentPlayerIndex];
  const result = engine.result(game);

  useEffect(() => {
    if (game.phase === 'completed' || currentPlayer?.id === HUMAN_ID || !currentPlayer) return;
    const timer = setTimeout(() => {
      const decision = chooseLalSattiBotAction(game, currentPlayer.id);
      if (!decision) return;
      setGame(engine.reduce(game, decision.action).state);
    }, 700);
    return () => clearTimeout(timer);
  }, [currentPlayer, game]);

  function play(cardId: string): void {
    const action = legalActions.find(
      (candidate) => candidate.type === 'PLAY_CARD' && candidate.cardId === cardId,
    );
    if (!action) return;
    setGame(engine.reduce(game, action).state);
  }

  function pass(): void {
    const action = legalActions.find((candidate) => candidate.type === 'PASS');
    if (!action) return;
    setGame(engine.reduce(game, action).state);
  }

  function rematch(): void {
    rngRef.current = seededRng(Date.now());
    setGame(engine.init(PLAYER_IDS, rngRef.current, undefined, BOT_IDS));
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.mode}>{t['lalSatti.modeLabel']}</Text>
        <Text style={styles.title}>
          {game.phase === 'completed'
            ? t['lalSatti.roundComplete']
            : currentPlayer?.id === HUMAN_ID
              ? t['lalSatti.yourTurnInstruction']
              : formatMessage(DEFAULT_LOCALE, 'lalSatti.waitingInstruction', {
                  name: playerName(currentPlayer?.id ?? ''),
                })}
        </Text>
      </View>

      <View style={styles.seats}>
        {game.players.map((player) => (
          <View
            key={player.id}
            style={[styles.seat, player.id === currentPlayer?.id ? styles.activeSeat : null]}
          >
            <Text style={styles.seatName}>{playerName(player.id)}</Text>
            <Text style={styles.seatCount}>
              {formatMessage(DEFAULT_LOCALE, 'game.cardsRemainingCount', {
                count: player.hand.length,
              })}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.tableau}>
        {toTableauLanes(game.tableau).map((lane) => (
          <View key={lane.suit} style={styles.lane}>
            <Text style={styles.laneSuit}>{suitGlyph(lane.suit)}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.laneCards}>
                {lane.cards.map((card) => (
                  <CardTile key={card.id} card={card} />
                ))}
              </View>
            </ScrollView>
          </View>
        ))}
      </View>

      <View style={styles.handHeader}>
        <Text style={styles.sectionTitle}>{t['lalSatti.yourCards']}</Text>
        {canPass ? (
          <Pressable style={styles.secondaryButton} onPress={pass}>
            <Text style={styles.secondaryButtonText}>{t['lalSatti.passTurn']}</Text>
          </Pressable>
        ) : (
          <Text style={styles.playableText}>{t['lalSatti.playableNow']}</Text>
        )}
      </View>

      <View style={styles.hand}>
        {human.hand.map((card) => {
          const playable = playableIds.includes(card.id);
          return (
            <Pressable key={card.id} disabled={!playable} onPress={() => play(card.id)}>
              <CardTile card={card} playable={playable} />
            </Pressable>
          );
        })}
      </View>

      {result ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>
            {formatMessage(DEFAULT_LOCALE, 'lalSatti.winnerLine', {
              name: result.winnerIds.map(playerName).join(', '),
            })}
          </Text>
          <Pressable style={styles.primaryButton} onPress={rematch}>
            <Text style={styles.primaryButtonText}>{t['action.rematch']}</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color['background.canvas'],
  },
  content: {
    gap: reactNativeTokens.space.md,
    padding: reactNativeTokens.space.md,
  },
  header: {
    gap: reactNativeTokens.space.sm,
    borderRadius: reactNativeTokens.radius.lg,
    backgroundColor: color['game.table'],
    padding: reactNativeTokens.space.lg,
  },
  mode: {
    color: color['text.onBrand'],
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: color['text.onBrand'],
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  seats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: reactNativeTokens.space.sm,
  },
  seat: {
    minWidth: 148,
    flexGrow: 1,
    borderRadius: reactNativeTokens.radius.md,
    backgroundColor: color['surface.primary'],
    padding: reactNativeTokens.space.md,
  },
  activeSeat: {
    borderWidth: 2,
    borderColor: color['brand.accent'],
  },
  seatName: {
    color: color['action.primary'],
    fontSize: 16,
    fontWeight: '700',
  },
  seatCount: {
    color: color['text.primary'],
    fontSize: 13,
  },
  tableau: {
    gap: reactNativeTokens.space.sm,
    borderRadius: reactNativeTokens.radius.lg,
    backgroundColor: color['game.table'],
    padding: reactNativeTokens.space.md,
  },
  lane: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: reactNativeTokens.space.sm,
  },
  laneSuit: {
    width: 28,
    color: color['text.onBrand'],
    fontSize: 28,
    fontWeight: '700',
  },
  laneCards: {
    flexDirection: 'row',
    gap: reactNativeTokens.space.xs,
  },
  handHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: reactNativeTokens.space.sm,
  },
  sectionTitle: {
    color: color['action.primary'],
    fontSize: 20,
    fontWeight: '700',
  },
  playableText: {
    color: color['brand.accent'],
    fontSize: 13,
    fontWeight: '700',
  },
  hand: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: reactNativeTokens.space.sm,
  },
  card: {
    width: 58,
    height: 84,
    justifyContent: 'space-between',
    borderRadius: reactNativeTokens.radius.md,
    backgroundColor: color['card.face'],
    padding: reactNativeTokens.space.xs,
  },
  cardPlayable: {
    borderWidth: 2,
    borderColor: color['action.secondary'],
    transform: [{ translateY: -6 }],
  },
  cardRank: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardSuit: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
  },
  redSuit: {
    color: color['card.suitRed'],
  },
  blackSuit: {
    color: color['card.suitBlack'],
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: reactNativeTokens.radius.md,
    backgroundColor: color['action.secondary'],
    padding: reactNativeTokens.space.md,
  },
  primaryButtonText: {
    color: color['text.primary'],
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    borderRadius: reactNativeTokens.radius.md,
    backgroundColor: color['action.secondary'],
    paddingHorizontal: reactNativeTokens.space.md,
    paddingVertical: reactNativeTokens.space.sm,
  },
  secondaryButtonText: {
    color: color['text.primary'],
    fontWeight: '800',
  },
  result: {
    gap: reactNativeTokens.space.md,
    borderRadius: reactNativeTokens.radius.lg,
    backgroundColor: color['action.primary'],
    padding: reactNativeTokens.space.lg,
  },
  resultTitle: {
    color: color['text.onBrand'],
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
});
