// Pure on purpose (no React), so it can be unit-tested. Each function is also a
// worklet: the viewer calls them from gesture callbacks on the UI thread.

/** 1x fits the picture to the frame; a pinch can take it to 4x. */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
/** Where a double-tap on an unzoomed picture lands. */
export const DOUBLE_TAP_ZOOM = 2.5;

export function clampZoom(scale: number): number {
  'worklet';
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/** The + and − buttons move one whole step, stopping at either end. */
export function stepZoom(scale: number, direction: 1 | -1): number {
  'worklet';
  return clampZoom(Math.round(scale) + direction);
}

/**
 * How far a picture zoomed about its centre may be dragged along one axis
 * before its edge comes inside the frame's edge. At 1x it cannot move.
 */
export function clampPan(offset: number, scale: number, frameSize: number): number {
  'worklet';
  const max = Math.max(0, (frameSize * (scale - 1)) / 2);
  return Math.min(max, Math.max(-max, offset));
}
