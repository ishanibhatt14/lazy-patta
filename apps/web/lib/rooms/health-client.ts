import { parseRoomServiceHealth, unavailableRoomHealth, type RoomServiceHealth } from './health';

const CLIENT_HEALTH_TIMEOUT_MS = 2_000;

export async function fetchRoomServiceHealth(
  signal?: AbortSignal,
  timeoutMs = CLIENT_HEALTH_TIMEOUT_MS,
): Promise<RoomServiceHealth> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = (): void => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await fetch('/api/rooms/health', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    const json = (await response.json().catch(() => undefined)) as unknown;
    const parsed = parseRoomServiceHealth(json);
    return response.ok ? parsed : { ...parsed, status: 'unavailable' };
  } catch (caught) {
    if (controller.signal.aborted || signal?.aborted) {
      throw caught;
    }
    return unavailableRoomHealth();
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}
