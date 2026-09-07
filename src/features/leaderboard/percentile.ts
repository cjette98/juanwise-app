/**
 * "Mas magaling ka kaysa sa N% ng iba" — the banner above the podium.
 *
 * Measured against the OTHER students, not against the whole board: rank 1 of
 * 5 beats all four others and reads 100%, rank 5 of 5 beats none and reads 0%.
 * Dividing by `total` instead would cap the top student at 80% and make the
 * best score on the board look like a partial one.
 *
 * Pure and separate from the screen so the edge cases below are testable
 * without a renderer.
 */

/**
 * @param rank 1-based position on the board.
 * @param total how many students are ranked.
 * @returns a whole percentage 0–100, or `null` when the comparison is
 *   meaningless — a board of one has nobody to be better than, and a rank
 *   outside the board is not a position at all.
 */
export function beatsPercent(rank: number, total: number): number | null {
  if (!Number.isFinite(rank) || !Number.isFinite(total)) return null;
  if (total < 2) return null;
  if (rank < 1 || rank > total) return null;

  const others = total - 1;
  return Math.round(((total - rank) / others) * 100);
}
