/** 1x fills the screen; each tap steps up, and the third tap comes back. */
export const ZOOM_STEPS = [1, 2, 3] as const;

export function nextZoomIndex(index: number): number {
  return (index + 1) % ZOOM_STEPS.length;
}

/**
 * Where to scroll so the zoomed canvas opens on its middle. The canvas is the
 * screen's size times the zoom and the picture is centred in it, so the
 * middle of the canvas is the middle of the picture.
 */
export function centredScrollOffset(
  screen: { width: number; height: number },
  zoom: number,
): { x: number; y: number } {
  return {
    x: (screen.width * zoom - screen.width) / 2,
    y: (screen.height * zoom - screen.height) / 2,
  };
}
