/**
 * Line icons on a 24x24 grid, stroked rather than filled so one path set
 * serves every size and colour. These replace the emoji the screens used to
 * draw, which could not be tinted and rendered differently per platform.
 *
 * Kept as data, apart from the component, so the set can be unit tested.
 */
export const ICONS = {
  home: ['M3.5 10.5L12 3.5l8.5 7', 'M5.5 9.5V20h13V9.5', 'M9.5 20v-5.5h5V20'],
  book: ['M4 5.5A2.5 2.5 0 016.5 3H19v15H6.5A2.5 2.5 0 004 20.5z', 'M4 20.5A2.5 2.5 0 016.5 18H19v3H6.5'],
  lesson: ['M12 3.5L22 8.5l-10 5-10-5z', 'M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5'],
  quiz: ['M5 3.5h9l5 5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V4.5a1 1 0 011-1z', 'M13.5 3.5V9H19', 'M8 13.5h7M8 17h5'],
  puzzle: ['M10 3.5h4a1 1 0 011 1v1.2a2 2 0 003 1.7 1 1 0 011.5.9v3.2a1 1 0 01-1.5.9 2 2 0 00-3 1.7V20a1 1 0 01-1 1h-4a1 1 0 01-1-1v-1.2a2 2 0 00-3-1.7 1 1 0 01-1.5-.9v-3.2a1 1 0 011.5-.9 2 2 0 003-1.7V4.5a1 1 0 011-1z'],
  trophy: ['M7 4h10v5a5 5 0 01-10 0z', 'M7 5.5H4.5V7a3.5 3.5 0 003 3.4M17 5.5h2.5V7a3.5 3.5 0 01-3 3.4', 'M12 14v3.5M8.5 20.5h7'],
  user: ['M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z', 'M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5'],
  star: ['M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z'],
  clock: ['M12 5a8 8 0 1 1 0 16 8 8 0 0 1 0-16z', 'M12 9v4l2.5 2M9 2.5h6'],
  lock: ['M4.5 10.5h15v10h-15z', 'M8 10.5V7a4 4 0 018 0v3.5'],
  check: ['M4 12.5l5 5L20 6.5'],
  close: ['M6 6l12 12M18 6L6 18'],
  chevronLeft: ['M15 5l-7 7 7 7'],
  chevronRight: ['M9 5l7 7-7 7'],
  medal: ['M12 3.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z', 'M8.5 13.5L7 21.5l5-2.5 5 2.5-1.5-8'],
  play: ['M7 4.5l12 7.5-12 7.5z'],
  key: ['M14.5 4a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z', 'M11 12.5L3.5 20v1.5H7v-2h2v-2h2z'],
  lightbulb: ['M9 18h6M10 21h4', 'M12 3a6 6 0 00-3.5 10.9c.6.5.9 1.1 1 1.6h5c.1-.5.4-1.1 1-1.6A6 6 0 0012 3z'],
  chart: ['M3 12h4l3-7 4 14 3-7h4'],
  flag: ['M6 21V4', 'M6 4.5h11l-2 4 2 4H6z'],
  bolt: ['M13 2.5L4.5 13.5H11l-1 8 8.5-11H12z'],
  refresh: ['M3.5 12a8.5 8.5 0 1 1 2.7 6.2', 'M3.5 19v-5h5'],
  eye: ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z', 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'],
  logout: ['M14 4.5H6a1.5 1.5 0 00-1.5 1.5v12A1.5 1.5 0 006 19.5h8', 'M16.5 15.5L20 12l-3.5-3.5M20 12H9.5'],
  grid: ['M3 3h7.5v7.5H3z', 'M13.5 3H21v7.5h-7.5z', 'M3 13.5h7.5V21H3z', 'M13.5 13.5H21V21h-7.5z'],
  bookmark: ['M5.5 4.5h13v15l-6.5-3.5-6.5 3.5z'],
} as const;

export type IconName = keyof typeof ICONS;

export default ICONS;
