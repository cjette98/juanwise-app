import { describe, expect, it } from 'vitest';
import { MAX_ZOOM, MIN_ZOOM, clampPan, clampZoom, stepZoom } from './zoom-steps';

/**
 * Correction 1, F8: the mini-lesson picture opened but its details could not
 * be zoomed on Android, where a scroll view does not pinch. The viewer now
 * pinches, drags and double-taps; these are the limits it keeps to.
 */

describe('clampZoom', () => {
  it('keeps the zoom between 1x and 4x', () => {
    expect(clampZoom(0.4)).toBe(MIN_ZOOM);
    expect(clampZoom(2.2)).toBe(2.2);
    expect(clampZoom(9)).toBe(MAX_ZOOM);
  });
});

describe('stepZoom', () => {
  it('moves one whole step and stops at either end', () => {
    expect(stepZoom(1, 1)).toBe(2);
    expect(stepZoom(2.4, 1)).toBe(3);
    expect(stepZoom(4, 1)).toBe(4);
    expect(stepZoom(1, -1)).toBe(1);
  });
});

describe('clampPan', () => {
  it('does not move an unzoomed picture', () => {
    expect(clampPan(50, 1, 390)).toBe(0);
  });

  it('stops at the edge of the picture at 2x', () => {
    // A 390-wide frame at 2x shows half the picture, so it can move 195 either way.
    expect(clampPan(300, 2, 390)).toBe(195);
    expect(clampPan(-300, 2, 390)).toBe(-195);
    expect(clampPan(100, 2, 390)).toBe(100);
  });
});
