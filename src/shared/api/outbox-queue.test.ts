import { describe, expect, it } from 'vitest';
import { removeSettled } from './outbox-queue';

const entry = (id: string, uid = 'u1') => ({ id, uid, payload: { n: id }, queuedAt: 0 });

describe('removeSettled', () => {
  it('drops only the settled ids', () => {
    const queue = [entry('a'), entry('b'), entry('c')];
    expect(removeSettled(queue, new Set(['a', 'c'])).map((e) => e.id)).toEqual(['b']);
  });

  it('keeps an entry enqueued while the flush was running', () => {
    // The flush started from [a, b] and settled both; meanwhile c was added.
    const reread = [entry('a'), entry('b'), entry('c')];
    expect(removeSettled(reread, new Set(['a', 'b'])).map((e) => e.id)).toEqual(['c']);
  });

  it("keeps other students' entries untouched", () => {
    const reread = [entry('a'), entry('x', 'u2')];
    expect(removeSettled(reread, new Set(['a']))).toEqual([entry('x', 'u2')]);
  });

  it('ignores settled ids that are no longer queued', () => {
    expect(removeSettled([entry('b')], new Set(['a'])).map((e) => e.id)).toEqual(['b']);
  });
});
