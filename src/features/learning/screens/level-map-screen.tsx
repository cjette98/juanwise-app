import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useGameProgress } from '@/features/learning/context/game-progress-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, ScreenHeader, Button, Pill, Icon, Display, H2, Caption } from '@/shared/components/ui';
import { tokens, categoryColor } from '@/shared/theme/tokens';

const LEVELS = [1, 2, 3, 4, 5] as const;

/** The 354x500 trail canvas from the "6 · Level path" artboard. */
const CANVAS_WIDTH = 354;
const CANVAS_HEIGHT = 500;

/** Node box (left, top, outer wrapper width, node size) per level, bottom (1) to top (5). */
const NODE_LAYOUT: Record<number, { left: number; top: number; width: number; size: number }> = {
  1: { left: 60, top: 420, width: 76, size: 76 },
  2: { left: 215, top: 340, width: 76, size: 76 },
  3: { left: 84, top: 236, width: 98, size: 94 },
  4: { left: 245, top: 155, width: 76, size: 76 },
  5: { left: 135, top: 60, width: 76, size: 76 },
};

const TRAIL_START = 'M98 458';
/** One winding bezier per gap between consecutive nodes (1→2, 2→3, 3→4, 4→5). */
const TRAIL_SEGMENTS = [
  'C160 458 210 430 253 378',
  'C290 330 190 320 133 283',
  'C80 250 240 235 283 193',
  'C320 155 230 140 173 98',
];
const TRAIL_D = [TRAIL_START, ...TRAIL_SEGMENTS].join(' ');

/** The lit portion of the trail runs from level 1 through the current level. */
function completedTrailD(currentLevel: number): string | null {
  const segmentsDone = Math.max(0, Math.min(currentLevel - 1, TRAIL_SEGMENTS.length));
  if (segmentsDone === 0) return null;
  return [TRAIL_START, ...TRAIL_SEGMENTS.slice(0, segmentsDone)].join(' ');
}

/**
 * A lighter tint of a category hue, for the completed trail — mixed toward
 * white rather than taken from a fixed palette entry, since the tint has to
 * follow whichever of the six category colours this screen was opened with.
 */
function lightenHex(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return '#' + [mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('');
}

export default function LevelMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category: string;
    label?: string;
    color?: string;
    activityType: string;
  }>();
  const { category, activityType } = params;
  const label = params.label || 'Category';
  const color = params.color || tokens.color.primary;
  const { isLevelUnlocked, getProgress } = useGameProgress();

  // isLevelUnlocked is the only gate; the "current" node is simply the
  // highest level it reports unlocked, and everything unlocked below that
  // reads as completed.
  const nodes = LEVELS.map((lvl) => ({ lvl, unlocked: isLevelUnlocked(category, activityType, lvl) }));
  const currentLevel = [...nodes].reverse().find((n) => n.unlocked)?.lvl ?? 1;
  const doneInCurrent = getProgress(category, activityType, currentLevel).length;

  const cat = categoryColor(category);
  const trailTint = lightenHex(cat.base, 0.55);
  const litTrailD = completedTrailD(currentLevel);

  const goToLevel = (lvl: number) =>
    router.navigate({ pathname: '/activity-list', params: { category, label, color, activityType, level: lvl } });

  return (
    <Screen>
      <ScreenHeader
        title={label}
        subtitle={activityType === 'jigsaw' ? 'Jigsaw Puzzle Mode' : 'Quiz Mode'}
        color={color}
        onBack={() => router.back()}
      />

      <View style={styles.mapArea}>
        <View style={styles.canvas}>
          <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} style={StyleSheet.absoluteFill}>
            <Path d={TRAIL_D} stroke={tokens.color.locked} strokeWidth={14} strokeLinecap="round" strokeDasharray="2 26" fill="none" />
            {litTrailD && (
              <Path d={litTrailD} stroke={trailTint} strokeWidth={14} strokeLinecap="round" strokeDasharray="2 26" fill="none" />
            )}
          </Svg>

          <View style={styles.trophy} pointerEvents="none">
            <Icon name="trophy" size={40} color={tokens.color.locked} strokeWidth={1.8} />
            <Caption style={styles.trophyLabel}>TROPHY</Caption>
          </View>

          {nodes.map(({ lvl, unlocked }) => {
            const layout = NODE_LAYOUT[lvl];
            const isCurrent = unlocked && lvl === currentLevel;

            return (
              <View key={lvl} style={[styles.nodeWrap, { left: layout.left, top: layout.top, width: layout.width }]}>
                {isCurrent && <Pill label="NANDITO KA" tone="gold" style={styles.currentPill} />}

                <TouchableOpacity
                  disabled={!unlocked}
                  activeOpacity={0.85}
                  onPress={() => goToLevel(lvl)}
                  style={[
                    styles.node,
                    unlocked
                      ? {
                          width: layout.size,
                          height: layout.size,
                          borderRadius: layout.size / 2,
                          backgroundColor: cat.base,
                          borderWidth: isCurrent ? 6 : 5,
                          borderColor: isCurrent ? tokens.color.gold : tokens.color.surface,
                          borderBottomWidth: tokens.hardShadow,
                          borderBottomColor: cat.dark,
                          ...tokens.elevation.card,
                        }
                      : {
                          width: layout.size,
                          height: layout.size,
                          borderRadius: layout.size / 2,
                          backgroundColor: tokens.color.locked,
                        },
                  ]}
                >
                  {unlocked ? (
                    isCurrent ? (
                      <Display style={styles.nodeNumber}>{lvl}</Display>
                    ) : (
                      <H2 style={styles.nodeNumber}>{lvl}</H2>
                    )
                  ) : (
                    <Icon name="lock" size={28} color={tokens.color.inkDisabled} strokeWidth={2.6} />
                  )}
                </TouchableOpacity>

                {isCurrent ? (
                  <Caption style={[styles.currentCaption, { color: cat.base }]}>{`${doneInCurrent} of 6 done`}</Caption>
                ) : (
                  <Caption style={unlocked ? styles.nodeLabel : styles.nodeLabelLocked}>{`Level ${lvl}`}</Caption>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <Button label={`Continue Level ${currentLevel}`} onPress={() => goToLevel(currentLevel)} color={cat.base} shadowColor={cat.dark} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, position: 'relative' },
  trophy: { position: 'absolute', right: 6, top: 4, alignItems: 'center', gap: tokens.space.xs, opacity: 0.6 },
  nodeWrap: { position: 'absolute', alignItems: 'center', gap: tokens.space.xs },
  currentPill: { marginBottom: tokens.space.xs },
  node: { alignItems: 'center', justifyContent: 'center' },
  nodeNumber: { color: tokens.color.onDark },
  nodeLabel: { color: tokens.color.inkMuted },
  nodeLabelLocked: { color: tokens.color.inkDisabled },
  trophyLabel: { color: tokens.color.inkFaint },
  currentCaption: { fontFamily: tokens.font.bodyBlack },
  footer: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg },
});
