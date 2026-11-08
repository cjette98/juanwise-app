// The widest a screen's content column grows. Phones are narrower, so this does
// nothing there; on a tablet (the app allows iPad, portrait only) it keeps cards,
// forms and lists at a readable width, centred, instead of stretched edge to
// edge. Headers stay full width. Kept free of React Native so it can be tested.
export const CONTENT_MAX_WIDTH = 640;

/** Spread into a scroll view's `contentContainerStyle` (or a body View's style). */
export const readableColumn = {
  width: '100%',
  maxWidth: CONTENT_MAX_WIDTH,
  alignSelf: 'center',
} as const;
