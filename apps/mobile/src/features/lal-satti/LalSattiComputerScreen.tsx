import { reactNativeTokens } from '@lazy-patta/design-tokens';
import type { Card, Rank, Rng, Suit } from '@lazy-patta/game-contracts';
import {
  chooseLalSattiBotAction,
  lalSattiHandPoints,
  LalSattiEngine,
  sortCards,
  toTableauLanes,
} from '@lazy-patta/lal-satti-engine';
import {
  DEFAULT_LOCALE,
  formatMessage,
  getMessages,
  LOCALES,
  type Locale,
  type MessageKey,
} from '@lazy-patta/localization';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const color = reactNativeTokens.color;
const engine = new LalSattiEngine();
const HUMAN_ID = 'you';
const BOT_IDS = ['ba', 'kaka', 'krina'];
const PLAYER_IDS = [HUMAN_ID, ...BOT_IDS];
const BOT_NAME_KEYS: Record<string, MessageKey> = {
  ba: 'lalSatti.botBa',
  kaka: 'lalSatti.botKaka',
  krina: 'lalSatti.botKrina',
};

interface MobileLeftoverScore {
  readonly playerId: string;
  readonly playerName: string;
  readonly cardCount: number;
  readonly cardPoints: number;
}

interface MobileRunningScore {
  readonly playerId: string;
  readonly playerName: string;
  readonly totalPenaltyPoints: number;
  readonly roundsNotWon: number;
}

interface MobileRoundScore {
  readonly id: string;
  readonly roundNumber: number;
  readonly winnerIds: readonly string[];
  readonly winnerNames: readonly string[];
  readonly leftovers: readonly MobileLeftoverScore[];
}

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

function normalizeHumanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 24);
}

function playerName(messages: Record<MessageKey, string>, id: string, humanName: string): string {
  return id === HUMAN_ID
    ? normalizeHumanName(humanName) || messages['computer.youName']
    : (messages[BOT_NAME_KEYS[id] ?? 'computer.botSeat'] ?? id);
}

function messageKey(prefix: 'rank' | 'suit', value: Rank | Suit): MessageKey {
  return `${prefix}.${value}` as MessageKey;
}

function cardAccessibleLabel(
  messages: Record<MessageKey, string>,
  locale: Locale,
  card: Card,
): string {
  return formatMessage(locale, 'card.accessibleFace', {
    rank: messages[messageKey('rank', card.rank)],
    suit: messages[messageKey('suit', card.suit)],
  });
}

function CardTile({
  card,
  playable = false,
  label,
}: {
  readonly card: Card;
  readonly playable?: boolean;
  readonly label: string;
}) {
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="image"
      style={[styles.card, playable ? styles.cardPlayable : null]}
    >
      <Text style={[styles.cardRank, red ? styles.redSuit : styles.blackSuit]}>
        {rankText(card.rank)}
      </Text>
      <Text style={[styles.cardSuit, red ? styles.redSuit : styles.blackSuit]}>
        {suitGlyph(card.suit)}
      </Text>
    </View>
  );
}

function roundScoreFor(
  game: ReturnType<LalSattiEngine['init']>,
  messages: Record<MessageKey, string>,
  roundNumber: number,
  humanName: string,
): MobileRoundScore {
  const winnerIds = new Set(game.winnerIds);
  return {
    id: `mobile-lal-satti-round-${roundNumber}`,
    roundNumber,
    winnerIds: game.winnerIds,
    winnerNames: game.winnerIds.map((id) => playerName(messages, id, humanName)),
    leftovers: game.players
      .filter((player) => !winnerIds.has(player.id))
      .map((player) => {
        const cards = sortCards(player.hand);
        return {
          playerId: player.id,
          playerName: playerName(messages, player.id, humanName),
          cardCount: cards.length,
          cardPoints: lalSattiHandPoints(cards),
        };
      }),
  };
}

function runningScoresFor(
  scores: readonly MobileRoundScore[],
  messages: Record<MessageKey, string>,
  humanName: string,
): readonly MobileRunningScore[] {
  return PLAYER_IDS.map((playerId, seatOrder) => {
    const leftovers = scores.flatMap((round) =>
      round.leftovers.filter((leftover) => leftover.playerId === playerId),
    );
    return {
      playerId,
      playerName: leftovers[0]?.playerName ?? playerName(messages, playerId, humanName),
      totalPenaltyPoints: leftovers.reduce((total, leftover) => total + leftover.cardPoints, 0),
      roundsNotWon: leftovers.length,
      seatOrder,
    };
  })
    .sort(
      (a, b) =>
        a.totalPenaltyPoints - b.totalPenaltyPoints ||
        a.roundsNotWon - b.roundsNotWon ||
        a.seatOrder - b.seatOrder,
    )
    .map(({ seatOrder: _seatOrder, ...score }) => score);
}

export function LalSattiComputerScreen(): ReactElement {
  const rngRef = useRef(seededRng(Date.now()));
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const messages = useMemo(() => getMessages(locale), [locale]);
  const [hasStarted, setHasStarted] = useState(false);
  const [humanName, setHumanName] = useState('');
  const [roundScores, setRoundScores] = useState<readonly MobileRoundScore[]>([]);
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
  const currentRoundScore =
    result && game.phase === 'completed'
      ? roundScoreFor(game, messages, roundScores.length + 1, humanName)
      : null;
  const visibleRoundScores = currentRoundScore ? [...roundScores, currentRoundScore] : roundScores;
  const runningScores = runningScoresFor(visibleRoundScores, messages, humanName);

  useEffect(() => {
    if (!hasStarted) return;
    if (game.phase === 'completed' || currentPlayer?.id === HUMAN_ID || !currentPlayer) return;
    const timer = setTimeout(() => {
      const decision = chooseLalSattiBotAction(game, currentPlayer.id);
      if (!decision) return;
      setGame(engine.reduce(game, decision.action).state);
    }, 700);
    return () => clearTimeout(timer);
  }, [currentPlayer, game, hasStarted]);

  function start(): void {
    if (!normalizeHumanName(humanName)) return;
    rngRef.current = seededRng(Date.now());
    setGame(engine.init(PLAYER_IDS, rngRef.current, undefined, BOT_IDS));
    setHasStarted(true);
  }

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
    if (currentRoundScore) {
      setRoundScores((scores) => [...scores, currentRoundScore]);
    }
    rngRef.current = seededRng(Date.now());
    setGame(engine.init(PLAYER_IDS, rngRef.current, undefined, BOT_IDS));
  }

  if (!hasStarted) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.mode}>{messages['lalSatti.modeLabel']}</Text>
          <Text style={styles.title}>{messages['lalSatti.setupTitle']}</Text>
          <Text style={styles.headerCopy}>{messages['lalSatti.setupDescription']}</Text>
        </View>

        <View style={styles.localeRow} accessibilityLabel={messages['settings.language']}>
          {LOCALES.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: locale === option }}
              style={[styles.localeButton, locale === option ? styles.localeButtonActive : null]}
              onPress={() => setLocale(option)}
            >
              <Text
                style={[
                  styles.localeButtonText,
                  locale === option ? styles.localeButtonTextActive : null,
                ]}
              >
                {option.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{messages['lalSatti.nameLabel']}</Text>
          <TextInput
            accessibilityLabel={messages['lalSatti.nameLabel']}
            autoCapitalize="words"
            maxLength={32}
            placeholder={messages['lalSatti.namePlaceholder']}
            placeholderTextColor={color['text.primary']}
            style={styles.nameInput}
            value={humanName}
            onChangeText={setHumanName}
          />
          <Text style={styles.helpText}>{messages['lalSatti.nameHelp']}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={messages['lalSatti.startGame']}
            accessibilityState={{ disabled: !normalizeHumanName(humanName) }}
            disabled={!normalizeHumanName(humanName)}
            style={[
              styles.primaryButton,
              !normalizeHumanName(humanName) ? styles.disabledButton : null,
            ]}
            onPress={start}
          >
            <Text style={styles.primaryButtonText}>{messages['lalSatti.startGame']}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.mode}>{messages['lalSatti.modeLabel']}</Text>
        <Text style={styles.title}>
          {game.phase === 'completed'
            ? messages['lalSatti.roundComplete']
            : currentPlayer?.id === HUMAN_ID
              ? messages['lalSatti.yourTurnInstruction']
              : formatMessage(locale, 'lalSatti.waitingInstruction', {
                  name: playerName(messages, currentPlayer?.id ?? '', humanName),
                })}
        </Text>
      </View>

      <View style={styles.localeRow} accessibilityLabel={messages['settings.language']}>
        {LOCALES.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: locale === option }}
            style={[styles.localeButton, locale === option ? styles.localeButtonActive : null]}
            onPress={() => setLocale(option)}
          >
            <Text
              style={[
                styles.localeButtonText,
                locale === option ? styles.localeButtonTextActive : null,
              ]}
            >
              {option.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.seats}>
        {game.players.map((player) => (
          <View
            key={player.id}
            style={[styles.seat, player.id === currentPlayer?.id ? styles.activeSeat : null]}
          >
            <Text style={styles.seatName}>{playerName(messages, player.id, humanName)}</Text>
            <Text style={styles.seatCount}>
              {formatMessage(locale, 'game.cardsRemainingCount', {
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
                  <CardTile
                    key={card.id}
                    card={card}
                    label={cardAccessibleLabel(messages, locale, card)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        ))}
      </View>

      <View style={styles.handHeader}>
        <Text style={styles.sectionTitle}>{messages['lalSatti.yourCards']}</Text>
        {canPass ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={messages['lalSatti.passTurn']}
            style={styles.secondaryButton}
            onPress={pass}
          >
            <Text style={styles.secondaryButtonText}>{messages['lalSatti.passTurn']}</Text>
          </Pressable>
        ) : (
          <Text style={styles.playableText}>{messages['lalSatti.playableNow']}</Text>
        )}
      </View>

      <View style={styles.hand}>
        {human.hand.map((card) => {
          const playable = playableIds.includes(card.id);
          const label = cardAccessibleLabel(messages, locale, card);
          return (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={formatMessage(locale, 'lalSatti.playCardLabel', {
                card: label,
              })}
              accessibilityState={{ disabled: !playable }}
              disabled={!playable}
              onPress={() => play(card.id)}
            >
              <CardTile card={card} playable={playable} label={label} />
            </Pressable>
          );
        })}
      </View>

      {result ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>
            {formatMessage(locale, 'lalSatti.winnerLine', {
              name: result.winnerIds.map((id) => playerName(messages, id, humanName)).join(', '),
            })}
          </Text>
          {currentRoundScore && currentRoundScore.leftovers.length > 0 ? (
            <View style={styles.resultLeftovers}>
              <Text style={styles.resultSubtitle}>{messages['lalSatti.leftoversTitle']}</Text>
              {currentRoundScore.leftovers.map((leftover) => (
                <Text key={leftover.playerId} style={styles.resultCopy}>
                  {formatMessage(locale, 'lalSatti.leftoverLine', {
                    name: leftover.playerName,
                    count: leftover.cardCount,
                    points: leftover.cardPoints,
                  })}
                </Text>
              ))}
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={messages['action.rematch']}
            style={styles.primaryButton}
            onPress={rematch}
          >
            <Text style={styles.primaryButtonText}>{messages['action.rematch']}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>{messages['lalSatti.scoreboardTitle']}</Text>
        <Text style={styles.helpText}>{messages['lalSatti.scoreboardHelp']}</Text>
        {visibleRoundScores.length === 0 ? (
          <Text style={styles.playableText}>{messages['lalSatti.scoreboardEmpty']}</Text>
        ) : (
          <View style={styles.scoreboard}>
            {runningScores.map((score) => (
              <View key={score.playerId} style={styles.scoreRow}>
                <Text style={styles.scoreName}>{score.playerName}</Text>
                <Text style={styles.scoreValue}>
                  {messages['lalSatti.scoreboardTotalLeft']}: {score.totalPenaltyPoints}
                </Text>
              </View>
            ))}
            {visibleRoundScores.map((round) => (
              <View key={round.id} style={styles.roundCard}>
                <Text style={styles.roundTitle}>
                  {formatMessage(locale, 'lalSatti.roundScoreLabel', {
                    round: round.roundNumber,
                  })}
                </Text>
                <Text style={styles.helpText}>
                  {formatMessage(locale, 'lalSatti.roundWinnerLine', {
                    name: round.winnerNames.join(', '),
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
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
  headerCopy: {
    color: color['text.onBrand'],
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    gap: reactNativeTokens.space.md,
    borderRadius: reactNativeTokens.radius.lg,
    backgroundColor: color['surface.primary'],
    padding: reactNativeTokens.space.md,
  },
  nameInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: color['brand.accent'],
    borderRadius: reactNativeTokens.radius.md,
    color: color['text.primary'],
    paddingHorizontal: reactNativeTokens.space.md,
  },
  helpText: {
    color: color['text.primary'],
    fontSize: 13,
    lineHeight: 20,
  },
  seats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: reactNativeTokens.space.sm,
  },
  localeRow: {
    flexDirection: 'row',
    gap: reactNativeTokens.space.sm,
  },
  localeButton: {
    minHeight: 44,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color['brand.accent'],
    borderRadius: reactNativeTokens.radius.md,
    backgroundColor: color['surface.primary'],
    paddingHorizontal: reactNativeTokens.space.md,
  },
  localeButtonActive: {
    borderColor: color['action.primary'],
    backgroundColor: color['action.primary'],
  },
  localeButtonText: {
    color: color['text.primary'],
    fontWeight: '800',
  },
  localeButtonTextActive: {
    color: color['text.onBrand'],
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
  disabledButton: {
    opacity: 0.5,
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
  resultLeftovers: {
    gap: reactNativeTokens.space.xs,
    borderRadius: reactNativeTokens.radius.md,
    backgroundColor: color['surface.primary'],
    padding: reactNativeTokens.space.md,
  },
  resultSubtitle: {
    color: color['action.primary'],
    fontSize: 15,
    fontWeight: '800',
  },
  resultCopy: {
    color: color['text.primary'],
    fontSize: 13,
    lineHeight: 20,
  },
  scoreboard: {
    gap: reactNativeTokens.space.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: reactNativeTokens.space.sm,
    borderTopWidth: 1,
    borderTopColor: color['brand.accent'],
    paddingTop: reactNativeTokens.space.sm,
  },
  scoreName: {
    color: color['text.primary'],
    fontWeight: '800',
  },
  scoreValue: {
    color: color['text.primary'],
    fontSize: 13,
  },
  roundCard: {
    gap: reactNativeTokens.space.xs,
    borderRadius: reactNativeTokens.radius.md,
    backgroundColor: color['background.canvas'],
    padding: reactNativeTokens.space.md,
  },
  roundTitle: {
    color: color['action.primary'],
    fontWeight: '800',
  },
});
