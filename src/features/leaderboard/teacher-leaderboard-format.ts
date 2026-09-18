import { tokens } from '@/shared/theme/tokens';
import type { IconName } from '@/shared/components/ui/icon';
import type { TranslationKey } from '@/shared/i18n/language-context';
import type { LearnerPace } from '@/features/results/context/student-results-context';

/** Seconds as `14m 20s`. Minutes keep counting past an hour — a teacher reads these as effort, not clock time. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, '0')}s`;
}

/**
 * The badge a pace draws with. Replaces the old `PACE_META`, whose labels were
 * emoji strings and whose colours were three hexes belonging to no palette.
 */
export function paceTone(pace: LearnerPace): { bg: string; fg: string; icon: IconName; labelKey: TranslationKey } {
  switch (pace) {
    case 'fast':
      return { bg: tokens.color.successSoft, fg: tokens.color.successInk, icon: 'bolt', labelKey: 'paceFast' };
    case 'needs-support':
      return { bg: tokens.color.goldSoft, fg: tokens.color.goldInk, icon: 'help', labelKey: 'paceNeedsSupport' };
    case 'steady':
    default:
      return { bg: tokens.color.surfaceSunken, fg: tokens.color.inkMuted, icon: 'minus', labelKey: 'paceSteady' };
  }
}
