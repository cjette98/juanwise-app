import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from './client';
import { resultsApi } from './endpoints';
import type { ApiActivityResult, SubmitResultRequest } from './types';

/**
 * A student can finish an activity while the wifi is down. Losing that attempt
 * would lose points they actually earned, so a failed `POST /results` is parked
 * here and replayed on the next successful call.
 *
 * Only genuinely transient failures are queued — a 422 means the payload is
 * wrong and replaying it forever would never help.
 */
const OUTBOX_KEY = 'juanwise_result_outbox_v1';
const MAX_ENTRIES = 200;

interface OutboxEntry {
  /** Stable id so a replay that half-succeeds cannot duplicate the entry. */
  id: string;
  uid: string;
  payload: SubmitResultRequest;
  queuedAt: number;
}

async function read(): Promise<OutboxEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as OutboxEntry[]) : [];
  } catch (e) {
    console.warn('outbox: failed to read', e);
    return [];
  }
}

async function write(entries: OutboxEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch (e) {
    console.warn('outbox: failed to write', e);
  }
}

export async function enqueueResult(uid: string, payload: SubmitResultRequest): Promise<void> {
  const entries = await read();
  entries.push({
    id: `${uid}-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    uid,
    payload,
    queuedAt: Date.now(),
  });
  await write(entries);
}

export async function pendingCount(uid: string): Promise<number> {
  return (await read()).filter((entry) => entry.uid === uid).length;
}

let flushing = false;

/**
 * Replays this student's queued attempts oldest first, stopping at the first
 * transient failure so the order is preserved. Returns whatever the server
 * recorded, for the caller to merge into its local list.
 */
export async function flushOutbox(uid: string): Promise<ApiActivityResult[]> {
  if (flushing) return [];
  flushing = true;

  const recorded: ApiActivityResult[] = [];
  try {
    const entries = await read();
    const mine = entries.filter((entry) => entry.uid === uid);
    if (!mine.length) return [];

    const settled = new Set<string>();

    for (const entry of mine) {
      try {
        recorded.push(await resultsApi.submit(entry.payload));
        settled.add(entry.id);
      } catch (err) {
        if (err instanceof ApiError && !err.isTransient) {
          // Permanently rejected — drop it rather than retry forever.
          settled.add(entry.id);
          console.warn('outbox: dropping rejected result', err.message);
          continue;
        }
        break;
      }
    }

    if (settled.size) {
      await write(entries.filter((entry) => !settled.has(entry.id)));
    }
  } finally {
    flushing = false;
  }

  return recorded;
}

export async function clearOutbox(): Promise<void> {
  await AsyncStorage.removeItem(OUTBOX_KEY).catch(() => undefined);
}
