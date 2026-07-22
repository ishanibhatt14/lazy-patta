import { NextResponse } from 'next/server';

import {
  degradedRoomHealth,
  unavailableRoomHealth,
  type RoomServiceHealth,
} from '../../../../lib/rooms/health';
import {
  getSupabaseAdminClient,
  isAuthorityConfigured,
} from '../../../../lib/supabase/admin-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUCCESS_CACHE_MS = 30_000;
const HEALTH_TIMEOUT_MS = 1_500;

let cachedSuccess: { readonly expiresAt: number; readonly health: RoomServiceHealth } | undefined;

function correlationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `room-health-${Date.now()}`;
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('room health timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET(): Promise<Response> {
  if (cachedSuccess && cachedSuccess.expiresAt > Date.now()) {
    return NextResponse.json(cachedSuccess.health, {
      headers: { 'cache-control': 'private, max-age=15' },
    });
  }

  if (!isAuthorityConfigured()) {
    return NextResponse.json(unavailableRoomHealth(), {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }

  const id = correlationId();
  try {
    const admin = getSupabaseAdminClient();
    const result = await withTimeout(
      Promise.resolve(admin.from('rooms').select('id').limit(1)),
      HEALTH_TIMEOUT_MS,
    );
    if (result.error) {
      console.error('room-service-health-failed', {
        correlationId: id,
        message: result.error.message,
      });
      return NextResponse.json(unavailableRoomHealth(new Date().toISOString(), id), {
        status: 503,
        headers: { 'cache-control': 'no-store' },
      });
    }

    const health = degradedRoomHealth();
    cachedSuccess = { health, expiresAt: Date.now() + SUCCESS_CACHE_MS };
    return NextResponse.json(health, {
      headers: { 'cache-control': 'private, max-age=15' },
    });
  } catch (caught) {
    console.error('room-service-health-failed', {
      correlationId: id,
      message: caught instanceof Error ? caught.message : 'unknown error',
    });
    return NextResponse.json(unavailableRoomHealth(new Date().toISOString(), id), {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }
}
