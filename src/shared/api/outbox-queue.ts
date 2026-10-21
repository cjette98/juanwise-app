/**
 * Pure queue helpers for the result outbox, kept free of AsyncStorage so they
 * can be unit-tested.
 */

/**
 * Removes the entries a flush settled from the queue as it is stored *now*.
 * Filtering the flush's starting snapshot instead would silently lose anything
 * enqueued while the flush was waiting on the network.
 */
export function removeSettled<T extends { id: string }>(entries: T[], settled: ReadonlySet<string>): T[] {
  return entries.filter((entry) => !settled.has(entry.id));
}
