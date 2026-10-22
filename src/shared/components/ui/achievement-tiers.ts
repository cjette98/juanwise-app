import { tokens } from '@/shared/theme/tokens';

/**
 * The gold/silver/bronze tint, in one place — item 5.1 of the client
 * evaluation. Four screens each carried their own copy of this table, which
 * is how the leaderboard drifted onto a badge of its own.
 *
 * Kept as data, apart from the badge components, so it can be unit tested:
 * importing a component here would pull `react-native-svg` into the test
 * environment, which cannot load it.
 */

export type AchievementTier = 'gold' | 'silver' | 'bronze';

export const TIER_COLOR: Record<AchievementTier, string> = {
  gold: tokens.color.medalGold,
  silver: tokens.color.medalSilver,
  bronze: tokens.color.medalBronze,
};

/**
 * The colour of a tier, or `null` when there is none to draw. The API spells
 * "not earned" as the string `'none'` and the screens spell it `null`, so
 * both are accepted here rather than at every call site.
 */
export function tierColor(tier: AchievementTier | 'none' | null | undefined): string | null {
  return tier && tier !== 'none' ? TIER_COLOR[tier] : null;
}
