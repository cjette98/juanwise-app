import { describe, expect, it } from 'vitest';
import { ZOOM_STEPS, centredScrollOffset, nextZoomIndex } from './zoom-steps';

/**
 * Item 3.3 of the client evaluation. The zoomed picture sits in the middle of
 * a canvas the screen's size times the zoom, and the viewer used to open that
 * canvas at its top-left corner — at 2x and 3x a child saw mostly the dark
 * letterbox and had to scroll to find the picture they had just tapped.
 */

const phone = { width: 390, height: 844 };

describe('centredScrollOffset', () => {
  it('does not scroll at 1x, where the picture already fits the screen', () => {
    expect(centredScrollOffset(phone, 1)).toEqual({ x: 0, y: 0 });
  });

  it('scrolls to the middle of the canvas at 2x', () => {
    expect(centredScrollOffset(phone, 2)).toEqual({ x: 195, y: 422 });
  });

  it('scrolls to the middle of the canvas at 3x', () => {
    expect(centredScrollOffset(phone, 3)).toEqual({ x: 390, y: 844 });
  });
});

describe('nextZoomIndex', () => {
  it('steps 1x, 2x, 3x and back to 1x', () => {
    const seen = [0];
    for (let i = 0; i < ZOOM_STEPS.length; i++) seen.push(nextZoomIndex(seen[seen.length - 1]));
    expect(seen.map((i) => ZOOM_STEPS[i])).toEqual([1, 2, 3, 1]);
  });
});
