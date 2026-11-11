// The teacher app's per-activity jigsaw editing (Correction 1, N1), as the web
// console does it (juanwise-admin `features/jigsaw/jigsaw-screen.tsx`).
//
// A category holds pictures (`items`), each activity slot `"{level}_{num}"`
// points at one, and each slot may pin a cut of 6, 9 or 12 pieces. Every save
// sends all three together through `PUT .../jigsaws`, so these build the next
// full set from the current one.
//
// Pure on purpose (no React, no Expo), so it can be unit-tested.

import type { ApiJigsawItem, ApiJigsawPieceCount, JigsawItemInput } from '@/shared/api/types';
import { rampPieceCount } from './content-resolution';

export interface JigsawSet {
  items: JigsawItemInput[];
  slots: Record<string, string>;
  pieces: Record<string, ApiJigsawPieceCount>;
}

export type ItemDetails = Omit<ApiJigsawItem, 'id' | 'imageUrl'>;

export const PIECE_CHOICES: ApiJigsawPieceCount[] = [6, 9, 12];

/** The board a cut is laid out on, as the puzzle screen draws it. */
export function gridFor(pieces: ApiJigsawPieceCount): { rows: number; cols: number } {
  if (pieces === 6) return { rows: 2, cols: 3 };
  if (pieces === 9) return { rows: 3, cols: 3 };
  return { rows: 3, cols: 4 };
}

/** The cut the slot plays: its own, or the game's ramp (1-2 → 6, 3-4 → 9, 5-6 → 12). */
export function cutFor(set: JigsawSet, slot: string): { pieces: ApiJigsawPieceCount; pinned: boolean } {
  const pinned = set.pieces[slot];
  const activityNum = Number(slot.split('_')[1]);
  return pinned ? { pieces: pinned, pinned: true } : { pieces: rampPieceCount(activityNum), pinned: false };
}

export function itemFor(set: JigsawSet, slot: string): JigsawItemInput | null {
  const id = set.slots[slot];
  return id ? (set.items.find((item) => item.id === id) ?? null) : null;
}

/** Ids are minted on the device, as on the web, so a picture and its slot land in one save. */
export function newJigsawId(): string {
  return `jw_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Drops pictures no slot points at any more. */
function withoutOrphans(items: JigsawItemInput[], slots: Record<string, string>): JigsawItemInput[] {
  const used = new Set(Object.values(slots));
  return items.filter((item) => item.id !== undefined && used.has(item.id));
}

/**
 * Gives the slot a new picture. The slot's text carries over when it had a
 * picture of its own; the old picture is dropped if nothing else plays it.
 */
export function withPicture(set: JigsawSet, slot: string, imageUrl: string, fallbackTitle: string): JigsawSet {
  const previous = itemFor(set, slot);
  const id = newJigsawId();
  const item: JigsawItemInput = {
    id,
    imageUrl,
    title: previous?.title || fallbackTitle,
    definition_en: previous?.definition_en ?? null,
    definition_tl: previous?.definition_tl ?? null,
    context_en: previous?.context_en ?? null,
    context_tl: previous?.context_tl ?? null,
  };
  const slots = { ...set.slots, [slot]: id };
  return { ...set, items: withoutOrphans([...set.items, item], slots), slots };
}

/** Rewrites the text of the slot's picture. A slot with no picture of its own has none to rewrite. */
export function withDetails(set: JigsawSet, slot: string, details: ItemDetails): JigsawSet {
  const id = set.slots[slot];
  if (!id) return set;
  return { ...set, items: set.items.map((item) => (item.id === id ? { ...item, ...details } : item)) };
}

/** The slot goes back to the category picture; its cut stays, since it belongs to the activity. */
export function withoutPicture(set: JigsawSet, slot: string): JigsawSet {
  const slots = { ...set.slots };
  delete slots[slot];
  return { ...set, items: withoutOrphans(set.items, slots), slots };
}

/** `null` returns the slot to the game's ramp instead of pinning today's ramp value. */
export function withCut(set: JigsawSet, slot: string, cut: ApiJigsawPieceCount | null): JigsawSet {
  const pieces = { ...set.pieces };
  if (cut === null) delete pieces[slot];
  else pieces[slot] = cut;
  return { ...set, pieces };
}
