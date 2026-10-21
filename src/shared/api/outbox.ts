import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from './client';
import { resultsApi } from './endpoints';
import { removeSettled } from './outbox-queue';
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

/**
 * Read-modify-write of the stored queue, one at a time, so an enqueue and a
 * flush's write-back cannot interleave and resurrect or lose an entry.
 */
let queueLock: Promise<unknown> = Promise.resolve();
function mutate<T>(fn: () => Promise<T>): Promise<T> {
  const run = queueLock.then(fn, fn);
  queueLock = run.catch(() => undefined);
  return run;
}

export async function enqueueResult(uid: string, payload: SubmitResultRequest): Promise<void> {
  await mutate(async () => {
    const entries = await read();
    entries.push({
      id: `${uid}-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      uid,
      payload,
      queuedAt: Date.now(),
    });
    await write(entries);
  });
}

export async function pendingCount(uid: string): Promise<number> {
  return (await read()).filter((entry) => entry.uid === uid).length;
}

export interface FlushResult {
  /** What the server recorded, for the caller to merge into its local list. */
  recorded: ApiActivityResult[];
  /** Entries this flush removed from the queue — saved or permanently refused. */
  settled: number;
  /** This student's entries still queued afterwards (a transient failure stopped the flush). */
  remaining: number;
}

let inflight: Promise<FlushResult> | null = null;

/**
 * Replays this student's queued attempts oldest first, stopping at the first
 * transient failure so the order is preserved.
 *
 * A caller that arrives mid-flush waits for that flush instead of returning
 * early, so "nothing remaining" really means the server has every attempt.
 */
export async function flushOutbox(uid: string): Promise<FlushResult> {
  if (inflight) {
    await inflight.catch(() => undefined);
    return { recorded: [], settled: 0, remaining: await pendingCount(uid) };
  }
  inflight = runFlush(uid);
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

async function runFlush(uid: string): Promise<FlushResult> {
  const recorded: ApiActivityResult[] = [];
  const mine = (await read()).filter((entry) => entry.uid === uid);
  if (!mine.length) return { recorded, settled: 0, remaining: 0 };

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

  // Re-read rather than reuse the snapshot: an attempt enqueued while this
  // flush was on the network must survive the write-back.
  const left = await mutate(async () => {
    const next = removeSettled(await read(), settled);
    if (settled.size) await write(next);
    return next;
  });
  const remaining = left.filter((entry) => entry.uid === uid).length;

  return { recorded, settled: settled.size, remaining };
}

export async function clearOutbox(): Promise<void> {
  await AsyncStorage.removeItem(OUTBOX_KEY).catch(() => undefined);
}
