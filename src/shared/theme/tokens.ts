/**
 * Every design value the app draws with, as plain data.
 *
 * No React import on purpose: this is unit-tested, and the legibility and
 * tap-target floors in tokens.test.ts are the rules the old per-screen
 * StyleSheets kept breaking. A screen that needs a colour, radius, size or
 * shadow takes it from here rather than inventing one.
 */

const family = {
  display: 'Baloo2_800ExtraBold',
  displayBold: 'Baloo2_700Bold',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyBlack: 'Nunito_800ExtraBold',
} as const;

export const tokens = {
  font: family,

  color: {
    /* surfaces */
    canvas: '#FBF6EA',
    surface: '#FFFFFF',
    surfaceSunken: '#F4EEE0',
    border: '#EADFC7',
    borderStrong: '#E0D2B8',
    divider: '#F2EADB',
    locked: '#E7DEC9',

    /** The unfilled half of a progress track and of an unearned star. */
    track: '#EFE6D4',
    starEmpty: '#E0D6C0',

    /* ink */
    ink: '#2A2118',
    inkBody: '#3B3229',
    inkMuted: '#7A6A55',
    inkFaint: '#A08A6B',
    inkDisabled: '#A6957A',
    onDark: '#FFFFFF',
    onDarkMuted: 'rgba(255,255,255,0.78)',
    onDarkFaint: 'rgba(255,255,255,0.22)',

    /** Translucent fills that sit on a coloured header. */
    onDarkChip: 'rgba(255,255,255,0.18)',
    onDarkFill: 'rgba(255,255,255,0.16)',
    onDarkBorder: 'rgba(255,255,255,0.4)',

    /* brand — the flag */
    primary: '#0038A8',
    primaryDark: '#00246E',
    gold: '#FCD116',
    goldDark: '#D9AF00',
    goldInk: '#4A3410',
    goldSoft: '#FFF6D6',
    red: '#CE1126',

    /* status */
    success: '#2E9E5B',
    successDark: '#1E7442',
    successSoft: '#EAF7EF',
    successBorder: '#BFE3CD',
    successInk: '#1E6B3C',
    danger: '#C4304A',
    dangerSoft: '#FDEEEE',
    dangerBorder: '#EFC8CF',
    dangerInk: '#8E2136',
    warning: '#E8A93D',
    points: '#E8801A',

    /* medals */
    medalGold: '#FCD116',
    medalSilver: '#A8AEB8',
    medalBronze: '#CD7F32',

    /* the five home destinations keep the hues the app already uses */
    navCategories: '#E8801A',
    navLessons: '#2E9E5B',
    navQuiz: '#3B7DD8',
    navJigsaw: '#9B4FD6',
    navLeaderboard: '#D63B6E',
  },

  /** 6 / 10 / 13 / 18 / 22 / 30 — the rhythm the prototype was drawn on. */
  space: { xs: 6, sm: 10, md: 13, lg: 18, xl: 22, xxl: 30 },

  radius: { sm: 12, md: 16, lg: 20, xl: 22, card: 26, sheet: 34, pill: 999 },

  /**
   * letterSpacing is absolute in React Native, not an em multiple — 12 * 0.09
   * is where the 1.1 on `label` comes from.
   */
  type: {
    display: { fontFamily: family.display, fontSize: 34, lineHeight: 38 },
    h1: { fontFamily: family.display, fontSize: 24, lineHeight: 28 },
    h2: { fontFamily: family.displayBold, fontSize: 19, lineHeight: 23 },
    h3: { fontFamily: family.displayBold, fontSize: 17, lineHeight: 21 },
    body: { fontFamily: family.body, fontSize: 15, lineHeight: 23 },
    bodyStrong: { fontFamily: family.bodyBold, fontSize: 16.5, lineHeight: 21 },
    label: { fontFamily: family.bodyBlack, fontSize: 12, lineHeight: 16, letterSpacing: 1.1 },
    caption: { fontFamily: family.body, fontSize: 12.5, lineHeight: 17 },
    tab: { fontFamily: family.bodyBlack, fontSize: 11.5, lineHeight: 15 },
  },

  elevation: {
    /** Resting cards. */
    card: {
      shadowColor: '#2A2118',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 14,
      elevation: 3,
    },
    /** The one card a screen wants read first. */
    raised: {
      shadowColor: '#2A2118',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 22,
      elevation: 6,
    },
  },

  /**
   * Buttons get their chunky "pressable" look from a solid bottom border, not
   * a shadow: React Native has no `box-shadow: 0 6px 0`, and a border renders
   * identically on both platforms where `elevation` does not.
   */
  hardShadow: 6,

  hit: { min: 46, primary: 56 },
} as const;

const CATEGORY_COLORS: Record<string, { base: string; dark: string }> = {
  history: { base: '#2E6FB8', dark: '#1E4E85' },
  culture: { base: '#C9631D', dark: '#8F4614' },
  geography: { base: '#3E9E4F', dark: '#2B6F37' },
  festival: { base: '#B84FA0', dark: '#823771' },
  national: { base: '#C4304A', dark: '#8B2234' },
  heroes: { base: '#8A5A2B', dark: '#5F3E1D' },
};

export type CategoryKey = keyof typeof CATEGORY_COLORS;

/**
 * The six category hues, matched to `src/shared/content/category-meta.ts`,
 * plus a darker shade each for button bottom-borders.
 *
 * An unknown key falls back to heroes rather than to the `#5C3A21` that
 * `getCategoryMeta` returns for one: every caller here needs a valid
 * `{ base, dark }` pair, and that brown has no paired shade. The two only
 * diverge for a key that is not one of the six, which the content module
 * makes unreachable in practice.
 */
export function categoryColor(key: string): { base: string; dark: string } {
  return CATEGORY_COLORS[key] ?? CATEGORY_COLORS.heroes;
}

export default tokens;
