import { describe, expect, it } from 'vitest';
import { cutFor, gridFor, itemFor, withCut, withDetails, withPicture, withoutPicture, type JigsawSet } from './jigsaw-slots';

/**
 * Correction 1, N1: the teacher app edits each jigsaw activity as the web does.
 * One save sends pictures, slots and cuts together; these build that set.
 */

const base = (): JigsawSet => ({
  items: [
    { id: 'a', title: 'Manunggul Jar', imageUrl: 'https://x/a.jpg', definition_en: 'A jar', definition_tl: null, context_en: 'Lesson', context_tl: null },
    { id: 'b', title: 'Balangay', imageUrl: 'https://x/b.jpg', definition_en: null, definition_tl: null, context_en: null, context_tl: null },
  ],
  slots: { '1_1': 'a', '1_2': 'b', '2_1': 'b' },
  pieces: { '1_1': 12 },
});

describe('gridFor', () => {
  it('lays cuts out as the puzzle screen does', () => {
    expect(gridFor(6)).toEqual({ rows: 2, cols: 3 });
    expect(gridFor(9)).toEqual({ rows: 3, cols: 3 });
    expect(gridFor(12)).toEqual({ rows: 3, cols: 4 });
  });
});

describe('cutFor', () => {
  it('reads a pinned cut, else the ramp', () => {
    expect(cutFor(base(), '1_1')).toEqual({ pieces: 12, pinned: true });
    expect(cutFor(base(), '1_3')).toEqual({ pieces: 9, pinned: false });
  });
});

describe('withPicture', () => {
  it("replaces a slot's picture, keeps its text and drops the old one when unused", () => {
    const next = withPicture(base(), '1_1', 'https://x/new.jpg', 'Level 1 · Activity 1');
    const item = itemFor(next, '1_1');
    expect(item).toMatchObject({ imageUrl: 'https://x/new.jpg', title: 'Manunggul Jar', context_en: 'Lesson' });
    expect(next.items.some((i) => i.id === 'a')).toBe(false);
  });

  it('keeps a picture another activity still plays', () => {
    const next = withPicture(base(), '1_2', 'https://x/new.jpg', 'Level 1 · Activity 2');
    expect(itemFor(next, '2_1')?.id).toBe('b');
    expect(itemFor(next, '1_2')?.title).toBe('Balangay');
  });

  it('names a first picture after its slot', () => {
    const next = withPicture(base(), '3_4', 'https://x/new.jpg', 'Level 3 · Activity 4');
    expect(itemFor(next, '3_4')?.title).toBe('Level 3 · Activity 4');
  });
});

describe('withDetails / withoutPicture / withCut', () => {
  it('rewrites only the slot picture', () => {
    const details = { title: 'Jar', definition_en: null, definition_tl: 'Banga', context_en: 'EN', context_tl: 'TL' };
    const next = withDetails(base(), '1_1', details);
    expect(itemFor(next, '1_1')).toMatchObject(details);
    expect(withDetails(base(), '4_4', details)).toEqual(base());
  });

  it('clears a slot back to the category picture and keeps its cut', () => {
    const next = withoutPicture(base(), '1_1');
    expect(next.slots['1_1']).toBeUndefined();
    expect(next.items.map((i) => i.id)).toEqual(['b']);
    expect(next.pieces['1_1']).toBe(12);
  });

  it('pins a cut, and null returns to the ramp', () => {
    expect(withCut(base(), '1_3', 6).pieces['1_3']).toBe(6);
    expect(withCut(base(), '1_1', null).pieces['1_1']).toBeUndefined();
  });
});
