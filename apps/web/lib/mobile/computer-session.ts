import { isKnownPreset, resolvePreset, type BotDifficulty } from '@lazy-patta/game-contracts';

import {
  clampPlayerCount,
  findGameDefinition,
  isValidPlayerCount,
  type GameSlug,
} from './game-registry';

export interface ComputerGameConfig {
  readonly gameSlug: GameSlug;
  readonly humanName: string;
  readonly playerCount: number;
  readonly difficulty?: BotDifficulty;
  readonly reducedMotion: boolean;
  readonly confirmBeforePlay: boolean;
  /** Regional house-rule preset id; resolves to a real engine rule pack. */
  readonly presetId?: string;
}

export interface ComputerGameSession {
  readonly schemaVersion: 1;
  readonly sessionId: string;
  readonly gameSlug: GameSlug;
  readonly mode: 'computer';
  readonly config: ComputerGameConfig;
  readonly seed: string;
  readonly revision: number;
  readonly status: 'initializing' | 'playing' | 'round-complete' | 'abandoned';
  readonly engineState: null;
  readonly seriesState?: unknown;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const KEY_PREFIX = 'lazy-patta:mobile-computer-session:v1:';

function keyFor(sessionId: string): string {
  return `${KEY_PREFIX}${sessionId}`;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function randomId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  const bytes = new Uint8Array(12);
  globalThis.crypto?.getRandomValues?.(bytes);
  const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${suffix || Date.now().toString(36)}`;
}

function now(): string {
  return new Date().toISOString();
}

export function createClientRequestId(): string {
  return randomId('req');
}

export function normalizeComputerGameConfig(config: ComputerGameConfig): ComputerGameConfig {
  const game = findGameDefinition(config.gameSlug);
  if (!game) throw new Error('Unsupported game.');
  const playerCount = clampPlayerCount(game, config.playerCount);
  const humanName = config.humanName.trim().replace(/\s+/g, ' ').slice(0, 24);
  return {
    gameSlug: game.slug,
    humanName,
    playerCount,
    difficulty: game.computerOptions.supportsDifficulty
      ? (config.difficulty ?? game.computerOptions.defaultDifficulty ?? 'medium')
      : undefined,
    reducedMotion: config.reducedMotion,
    confirmBeforePlay: config.confirmBeforePlay,
    // Always resolve to a real, engine-backed preset (falls back to the game's
    // default when the requested id is missing or unknown).
    presetId: resolvePreset(game.slug, config.presetId).id,
  };
}

export function validateComputerGameConfig(config: ComputerGameConfig): void {
  const game = findGameDefinition(config.gameSlug);
  if (!game || !game.available) throw new Error('Unsupported game.');
  if (!isValidPlayerCount(game, config.playerCount)) throw new Error('Invalid player count.');
  if (config.difficulty !== undefined && !['easy', 'medium', 'hard'].includes(config.difficulty)) {
    throw new Error('Invalid difficulty.');
  }
  if (config.presetId !== undefined && !isKnownPreset(game.slug, config.presetId)) {
    throw new Error('Invalid house-rule preset.');
  }
}

function parseSession(raw: string | null): ComputerGameSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ComputerGameSession>;
    if (parsed.schemaVersion !== 1) return null;
    if (!parsed.sessionId || !parsed.gameSlug || parsed.mode !== 'computer') return null;
    if (!parsed.config || parsed.config.gameSlug !== parsed.gameSlug) return null;
    const normalized = normalizeComputerGameConfig(parsed.config);
    validateComputerGameConfig(normalized);
    return {
      schemaVersion: 1,
      sessionId: parsed.sessionId,
      gameSlug: parsed.gameSlug,
      mode: 'computer',
      config: normalized,
      seed: typeof parsed.seed === 'string' ? parsed.seed : randomId('seed'),
      revision: Number.isInteger(parsed.revision) ? parsed.revision! : 1,
      status:
        parsed.status === 'round-complete' || parsed.status === 'abandoned'
          ? parsed.status
          : 'playing',
      engineState: null,
      seriesState: parsed.seriesState,
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : now(),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : now(),
    };
  } catch {
    return null;
  }
}

export class ComputerGameSessionService {
  async create(
    config: ComputerGameConfig,
    options: {
      readonly requestId?: string;
      readonly seed?: string;
      readonly signal?: AbortSignal;
    } = {},
  ): Promise<ComputerGameSession> {
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const normalized = normalizeComputerGameConfig(config);
    validateComputerGameConfig(normalized);
    const timestamp = now();
    const session: ComputerGameSession = {
      schemaVersion: 1,
      sessionId: randomId('computer'),
      gameSlug: normalized.gameSlug,
      mode: 'computer',
      config: normalized,
      seed: options.seed ?? randomId('seed'),
      revision: 1,
      status: 'playing',
      engineState: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.save(session);
    return session;
  }

  async load(sessionId: string): Promise<ComputerGameSession | null> {
    return parseSession(storage()?.getItem(keyFor(sessionId)) ?? null);
  }

  async save(session: ComputerGameSession): Promise<void> {
    storage()?.setItem(keyFor(session.sessionId), JSON.stringify(session));
  }

  async restart(sessionId: string): Promise<ComputerGameSession> {
    const previous = await this.load(sessionId);
    if (!previous) throw new Error('Session not found.');
    return this.create(previous.config, { seed: randomId('seed') });
  }

  async delete(sessionId: string): Promise<void> {
    storage()?.removeItem(keyFor(sessionId));
  }
}

export class ComputerGameInitializer {
  private readonly inFlight = new Map<string, Promise<ComputerGameSession>>();

  constructor(private readonly sessions = new ComputerGameSessionService()) {}

  start(
    config: ComputerGameConfig,
    requestId: string,
    signal?: AbortSignal,
  ): Promise<ComputerGameSession> {
    const existing = this.inFlight.get(requestId);
    if (existing) return existing;

    const operation = this.sessions
      .create(config, { requestId, signal })
      .finally(() => this.inFlight.delete(requestId));
    this.inFlight.set(requestId, operation);
    return operation;
  }
}

export const computerGameSessions = new ComputerGameSessionService();
export const computerGameInitializer = new ComputerGameInitializer(computerGameSessions);
