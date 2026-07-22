export type RoomServiceStatus = 'available' | 'degraded' | 'unavailable';

export interface RoomServiceHealth {
  readonly status: RoomServiceStatus;
  readonly capabilities: {
    readonly createRoom: boolean;
    readonly joinRoom: boolean;
    readonly realtime: boolean;
    readonly reconnect: boolean;
    readonly rematch: boolean;
  };
  readonly checkedAt: string;
  readonly publicMessageKey?: string;
  readonly correlationId?: string;
}

const UNAVAILABLE: RoomServiceHealth['capabilities'] = {
  createRoom: false,
  joinRoom: false,
  realtime: false,
  reconnect: false,
  rematch: false,
};

export function unavailableRoomHealth(
  checkedAt = new Date().toISOString(),
  correlationId?: string,
): RoomServiceHealth {
  return {
    status: 'unavailable',
    capabilities: UNAVAILABLE,
    checkedAt,
    publicMessageKey: 'rooms.healthUnavailable',
    ...(correlationId ? { correlationId } : {}),
  };
}

export function degradedRoomHealth(checkedAt = new Date().toISOString()): RoomServiceHealth {
  return {
    status: 'degraded',
    capabilities: {
      createRoom: true,
      joinRoom: true,
      realtime: false,
      reconnect: false,
      rematch: false,
    },
    checkedAt,
    publicMessageKey: 'rooms.healthDegraded',
  };
}

export function availableRoomHealth(checkedAt = new Date().toISOString()): RoomServiceHealth {
  return {
    status: 'available',
    capabilities: {
      createRoom: true,
      joinRoom: true,
      realtime: true,
      reconnect: false,
      rematch: false,
    },
    checkedAt,
  };
}

export function parseRoomServiceHealth(value: unknown): RoomServiceHealth {
  if (!value || typeof value !== 'object') {
    return unavailableRoomHealth();
  }
  const candidate = value as Partial<RoomServiceHealth>;
  if (
    candidate.status !== 'available' &&
    candidate.status !== 'degraded' &&
    candidate.status !== 'unavailable'
  ) {
    return unavailableRoomHealth();
  }
  const capabilities = candidate.capabilities;
  if (!capabilities || typeof capabilities !== 'object') {
    return unavailableRoomHealth(candidate.checkedAt);
  }
  return {
    status: candidate.status,
    capabilities: {
      createRoom: capabilities.createRoom === true,
      joinRoom: capabilities.joinRoom === true,
      realtime: capabilities.realtime === true,
      reconnect: capabilities.reconnect === true,
      rematch: capabilities.rematch === true,
    },
    checkedAt:
      typeof candidate.checkedAt === 'string' ? candidate.checkedAt : new Date().toISOString(),
    ...(typeof candidate.publicMessageKey === 'string'
      ? { publicMessageKey: candidate.publicMessageKey }
      : {}),
    ...(typeof candidate.correlationId === 'string'
      ? { correlationId: candidate.correlationId }
      : {}),
  };
}
