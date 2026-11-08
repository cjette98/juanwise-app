import React, { useState, useRef, useEffect, useMemo } from 'react';
import { decideExit } from '@/features/learning/lib/exit-rule';
import { useExitGuard } from '@/features/learning/lib/use-exit-guard';
import {
  View, StyleSheet, Image, Animated, PanResponder, Dimensions, TouchableOpacity, Modal, ScrollView, Alert,
} from 'react-native';
import Svg, { Path, Image as SvgImage, ClipPath, Defs, G } from 'react-native-svg';
import { useGameProgress } from '@/features/learning/context/game-progress-context';
import { useClassContent } from '@/features/learning/context/class-content-context';
import ActivityTimer, { ActivityTimerHandle, ActivityTimerResult } from '@/shared/components/activity-timer';
import { levelScore, starsForMedal, useStudentResults } from '@/features/results/context/student-results-context';
import { JIGSAW_TIME_BUDGET_SECONDS } from '@/features/results/lib/game-limits';
import { useUser } from '@/features/auth/context/user-context';
import { triesLeft } from '@/features/learning/lib/attempt-rules';
import { useLanguage } from '@/shared/i18n/language-context';
import { useSound } from '@/shared/audio/sound-context';
import { getCategoryMeta } from '@/shared/content/category-meta';
import { ApiError, errorMessage } from '@/shared/api';
import { generateEdgeMap, getPieceEdges, piecePathD } from '@/features/jigsaw/lib/jigsaw-shapes';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toNum } from '@/shared/lib/params';
import {
  Screen, ScreenHeader, Card, Button, Icon, Pill, ProgressBar, ScoreBadge, StarRow, ZoomableImage, H2, H3, Body, BodyStrong, Caption, Label,
} from '@/shared/components/ui';
import { tokens, categoryColor } from '@/shared/theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Slightly under the old 82% so the reference row above the board and the
// tray below it both fit, and the tray's pieces (sized from the board) show
// more at once.
const BOARD_SIZE = SCREEN_WIDTH * 0.78;
const REFERENCE_SIZE = 72;

// Jigsaw activity timer — 60 seconds per puzzle, the same as a quiz question
// (client clarification, 2026-11-07).
const ACTIVITY_DURATION = JIGSAW_TIME_BUDGET_SECONDS;

function getGrid(pieceCount: number) {
  if (pieceCount === 6) return { rows: 2, cols: 3 };
  if (pieceCount === 9) return { rows: 3, cols: 3 };
  return { rows: 3, cols: 4 };
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Points and the medal behind the star rating are awarded by the API
// (`POST /results` → juanwise-be `results/scoring.ts`) out of the 60s budget
// this screen reports against. Scoring lives in one place now, so the jigsaw
// results, the leaderboard and the class analytics can never disagree.
// Max per level is still 15 * 6 activities = 90 pts, the same cap as Quiz.

function formatTime(seconds?: number | null) {
  const s = Math.max(0, Math.round(seconds ?? 0));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

type Phase = 'playing' | 'success' | 'failed';

export default function JigsawPuzzleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category: string;
    label: string;
    color: string;
    level: string;
    activityNum: string;
    pieceCount: string;
    difficulty: string;
  }>();
  const { category, color, difficulty } = params;
  const level = toNum(params.level, 1);
  const activityNum = toNum(params.activityNum, 1);
  const pieceCount = toNum(params.pieceCount, 6);
  const { recordOutcome, refresh: refreshProgress } = useGameProgress();
  const { addResult, results } = useStudentResults();
  const { name: studentName, uid } = useUser();
  // The level's running score, shown on every result pop-up (Adjustment 3, item 5).
  const levelNow = useMemo(
    () => levelScore(results, { uid, category, activityType: 'jigsaw', level }),
    [results, uid, category, level],
  );
  const { getEffectiveCategoryContent } = useClassContent();
  const { t } = useLanguage();
  const label = t(getCategoryMeta(category).labelKey) || params.label;
  const cat = categoryColor(category);

  const { rows, cols } = getGrid(pieceCount);
  const pieceWidth = BOARD_SIZE / cols;
  const pieceHeight = BOARD_SIZE / rows;
  // Extra canvas room around every piece so its tabs/blanks have space to
  // poke outside the piece's own cell rectangle.
  const marginX = pieceHeight * 0.38;
  const marginY = pieceWidth * 0.38;
  const canvasW = pieceWidth + marginX * 2;
  const canvasH = pieceHeight + marginY * 2;

  // An admin-uploaded picture (PUT /content/categories/:key) replaces the
  // bundled one for every student, not just the device it was picked on.
  // Level and activity decide which picture from the category's jigsaw library
  // this attempt gets, so consecutive activities are not the same image.
  const content = getEffectiveCategoryContent(category, level, activityNum);
  const puzzleImage = content.image;

  // Generated once per attempt: which internal edges are tabs vs. blanks,
  // and the resulting SVG outline path for every piece.
  const edgeMap = useMemo(() => generateEdgeMap(rows, cols), [rows, cols]);
  const pathById = useMemo(() => {
    const paths: string[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const edges = getPieceEdges(edgeMap, rows, cols, r, c);
        paths.push(piecePathD(pieceWidth, pieceHeight, marginX, marginY, edges));
      }
    }
    return paths;
  }, [edgeMap, rows, cols, pieceWidth, pieceHeight, marginX, marginY]);

  // The tray is dealt in a random order, and Shuffle deals it again. Only the
  // order pieces sit in changes — nothing is taken off the board and the timer
  // keeps running, so re-dealing is a way to bring a buried piece to hand
  // rather than a restart.
  const [deal, setDeal] = useState(0);
  const trayOrder = useMemo(
    () => shuffle(Array.from({ length: pieceCount }, (_, i) => i)),
    // `deal` is not read here — bumping it is what asks for a fresh deal.
    [pieceCount, deal],
  );
  const reshuffleTray = () => setDeal((n) => n + 1);

  const [placedIds, setPlacedIds] = useState<Set<number>>(new Set());
  const placedRef = useRef(placedIds);
  /** Whether any piece has been placed this visit; leaving before that is not an attempt. */
  const startedRef = useRef(false);
  /** Set when the server has no try left, so the way out is never guarded again. */
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    placedRef.current = placedIds;
  }, [placedIds]);

  const [dragPieceId, setDragPieceId] = useState<number | null>(null);
  const dragXY = useRef(new Animated.ValueXY()).current;

  const { playSfx } = useSound();
  const [phase, setPhase] = useState<Phase>('playing');
  /** Last piece placed, waiting on the server for the points. */
  const [scoring, setScoring] = useState(false);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const [result, setResult] = useState<(ActivityTimerResult & { stars: number; points: number }) | null>(null);
  const [queued, setQueued] = useState(false);
  const [attemptSeq, setAttemptSeq] = useState(0);
  // After a fail: how many tries remain, or that the activity is now closed.
  const triesLine = (seq: number) => {
    const left = triesLeft(seq);
    return left > 0
      ? t('triesLeftAfterFail', { n: left, tries: t(left === 1 ? 'tryWordOne' : 'tryWordMany') })
      : t('activityFinishedNoTries');
  };

  // Shows a zoomed-in reveal of the completed picture the moment the puzzle
  // is solved, before the activity-results modal appears.
  const [revealSeen, setRevealSeen] = useState(false);
  const revealScale = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    if (phase === 'success') {
      revealScale.setValue(0.7);
      Animated.spring(revealScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }).start();
    }
  }, [phase]);

  const timerRef = useRef<ActivityTimerHandle>(null);

  const boardRef = useRef<View>(null);
  const boardPageRef = useRef({ x: 0, y: 0 });
  const measureBoard = () => {
    boardRef.current?.measureInWindow((x, y) => {
      boardPageRef.current = { x, y };
    });
  };

  // Everything below is for dragging a piece as a floating overlay that
  // sits ABOVE the whole screen (board + tray), instead of living inside
  // the tray's ScrollView — a ScrollView clips anything dragged outside
  // its own box, which is what was making pieces look like they vanished
  // "behind" the board while dragging.
  const overlayRef = useRef<View>(null);
  const overlayOriginRef = useRef({ x: 0, y: 0 });
  const measureOverlay = () => {
    overlayRef.current?.measureInWindow((x, y) => {
      overlayOriginRef.current = { x, y };
    });
  };
  const pieceRefs = useRef<Record<number, View | null>>({});
  const dragOriginRef = useRef({ x: 0, y: 0 });

  // Guide image visibility by Level difficulty (per spec):
  // Level 1 Easy = 35%, Level 2-3 Normal = 20%, Level 4-5 Hard = 10%.
  const guideOpacity = difficulty === 'Easy' ? 0.35 : difficulty === 'Normal' ? 0.2 : 0.1;

  // One attempt per visit — no auto-reshuffle-and-continue. A failed/timed
  // out attempt marks the activity red on the Activity List; retrying means
  // backing out and reopening the card for a fresh shuffle + fresh timer.
  //
  // The screen reports solved/not-solved as 1-of-1 or 0-of-1 correct; the API
  // turns that plus the time used into points and a medal.
  const recordAttempt = async (timerResult: ActivityTimerResult, solved: boolean) => {
    try {
      const { result: recorded, queued } = await addResult({
        category,
        activityType: 'jigsaw',
        level,
        activityNum,
        timeUsed: timerResult.timeUsed,
        timedOut: timerResult.timedOut,
        correctCount: solved ? 1 : 0,
        requiredCount: 1,
      });

      setQueued(queued);
      setAttemptSeq(recorded.attemptSeq);
      setResult({
        ...timerResult,
        medal: recorded.medal,
        points: recorded.points,
        stars: starsForMedal(recorded.medal),
      });

      if (recorded.medal) {
        recordOutcome(category, 'jigsaw', level, activityNum, true, recorded.attemptSeq, { queued });
        setTimeout(() => setPhase('success'), 250);
      } else {
        recordOutcome(category, 'jigsaw', level, activityNum, false, recorded.attemptSeq, { queued });
        playSfx('wrong');
        setPhase('failed');
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // The server has no try left for this activity (cap reached or already
        // passed). Retrying here can never succeed, so sync the cards and leave.
        void refreshProgress();
        setClosed(true);
        Alert.alert(t('notRecordedTitle'), errorMessage(err, t('notRecordedResultMsg')), [
          { text: t('okBtn'), onPress: () => router.back() },
        ], { cancelable: false });
        return;
      }
      Alert.alert(t('notRecordedTitle'), errorMessage(err, t('notRecordedResultMsg')));
      phaseRef.current = 'playing';
      setScoring(false);
      setPhase('playing');
    }
  };

  const recordFailedAttempt = (timerResult: ActivityTimerResult) => {
    void recordAttempt(timerResult, false);
  };

  const handleWin = (finalPlaced: Set<number>) => {
    const isSolved = finalPlaced.size === pieceCount;
    if (isSolved && phaseRef.current === 'playing') {
      phaseRef.current = 'success';
      // The puzzle is solved on this frame; only the points wait for the
      // server, so the fanfare and the "scoring" line go out now.
      playSfx('complete');
      setScoring(true);
      const timerResult = timerRef.current?.stop();
      if (timerResult) void recordAttempt(timerResult, true);
    }
  };

  const handleExpire = (timerResult: ActivityTimerResult) => {
    if (phaseRef.current !== 'playing') return;
    recordFailedAttempt(timerResult);
  };

  // Every way out while playing (Back button, Android back, iOS swipe) lands
  // here. Leaving before placing a piece records nothing and the next visit
  // starts a fresh timer; leaving a started puzzle counts as a failed attempt,
  // like a timeout (Adjustment 3, item 2).
  useExitGuard(phase === 'playing' && !closed, () => {
    if (phaseRef.current !== 'playing') return 'stay';
    if (decideExit({ inPlay: true, started: startedRef.current }) === 'leave') {
      timerRef.current?.stop();
      return 'leave';
    }
    const timerResult = timerRef.current?.stop();
    if (timerResult) recordFailedAttempt(timerResult);
    return 'stay';
  });

  const handleBackPress = () => {
    router.back();
  };

  const handleContinue = () => {
    router.back();
  };

  const makePanResponder = (pieceId: number, correctRow: number, correctCol: number) => {
    return PanResponder.create({
      // Any piece can be picked up while playing — including ones already
      // locked onto the board, so the player can pull a placed piece back
      // out if they want to remove/reposition it.
      onStartShouldSetPanResponder: () => phase === 'playing',
      onMoveShouldSetPanResponder: () => phase === 'playing',
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        measureBoard();
        measureOverlay();
        dragXY.setValue({ x: 0, y: 0 });
        const ref = pieceRefs.current[pieceId];
        ref?.measureInWindow((x, y) => {
          dragOriginRef.current = { x: x - overlayOriginRef.current.x, y: y - overlayOriginRef.current.y };
          setDragPieceId(pieceId);
        });
      },
      // Update the animated position directly from the gesture state instead
      // of using Animated.event(...) as the handler. On this project's setup
      // (RN 0.81 + New Architecture/Fabric), the object Animated.event()
      // returns is not callable, which threw
      // "handleDragMove/onPanResponderMove is not a function (it is Object)".
      // setValue() works reliably in all cases (JS-driven, not native-driven).
      onPanResponderMove: (_evt, gesture) => {
        dragXY.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_evt, gesture) => {
        const localX = gesture.moveX - boardPageRef.current.x;
        const localY = gesture.moveY - boardPageRef.current.y;
        const cellCenterX = correctCol * pieceWidth + pieceWidth / 2;
        const cellCenterY = correctRow * pieceHeight + pieceHeight / 2;
        const withinX = Math.abs(localX - cellCenterX) < pieceWidth * 0.55;
        const withinY = Math.abs(localY - cellCenterY) < pieceHeight * 0.55;
        const wasPlaced = placedRef.current.has(pieceId);

        if (withinX && withinY) {
          // Dropped inside its correct square — place it (or leave it
          // placed if it already was).
          if (!wasPlaced) {
            startedRef.current = true;
            const next = new Set(placedRef.current);
            next.add(pieceId);
            placedRef.current = next;
            setPlacedIds(next);
            // The last piece is answered by `complete` once the result lands.
            if (next.size < pieceCount) playSfx('snap');
            setDragPieceId(null);
            dragXY.setValue({ x: 0, y: 0 });
            handleWin(next);
          } else {
            setDragPieceId(null);
            dragXY.setValue({ x: 0, y: 0 });
          }
          return;
        }

        if (wasPlaced) {
          // Dragged an already-placed piece out of its square — remove it
          // from the board and send it back to the tray.
          const next = new Set(placedRef.current);
          next.delete(pieceId);
          placedRef.current = next;
          setPlacedIds(next);
          setDragPieceId(null);
          dragXY.setValue({ x: 0, y: 0 });
          return;
        }

        Animated.spring(dragXY, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 6 }).start(() => {
          setDragPieceId(null);
        });
      },
    });
  };

  const renderPieceSvg = (pieceId: number, correctRow: number, correctCol: number, opts?: { strokeWidth?: number }) => (
    <Svg width={canvasW} height={canvasH}>
      <Defs>
        <ClipPath id={`clip-${pieceId}`}>
          <Path d={pathById[pieceId]} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#clip-${pieceId})`}>
        <SvgImage
          href={puzzleImage}
          x={marginX - correctCol * pieceWidth}
          y={marginY - correctRow * pieceHeight}
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          preserveAspectRatio="xMidYMid slice"
        />
      </G>
      <Path
        d={pathById[pieceId]}
        fill="none"
        stroke={tokens.color.onDark}
        strokeOpacity={0.85}
        strokeWidth={opts?.strokeWidth ?? 1.4}
      />
    </Svg>
  );

  const remainingTray = trayOrder.filter((id) => !placedIds.has(id));
  const canShuffle = phase === 'playing' && dragPieceId === null && remainingTray.length > 1;
  // Reset (from the client's mock-up) sends every placed piece back to the
  // tray. The clock keeps running, and the visit still counts as started, so
  // leaving afterwards is still a failed try (Adjustment 3, items 2 and 9).
  const canReset = phase === 'playing' && dragPieceId === null && placedIds.size > 0;
  const resetBoard = () => {
    const empty = new Set<number>();
    placedRef.current = empty;
    setPlacedIds(empty);
  };

  return (
    <Screen>
      <ScreenHeader
        title={t('headerLevelTitle', { label, level })}
        color={color}
        right={
          <ActivityTimer
            ref={timerRef}
            durationSeconds={ACTIVITY_DURATION}
            color={color}
            isPaused={phase !== 'playing'}
            onExpire={handleExpire}
          />
        }
      >
        <View style={styles.headerStatsRow}>
          <Icon name="star" size={14} color={tokens.color.gold} filled />
          <Caption style={styles.headerStatsText}>{t('activity')} {activityNum}</Caption>
        </View>
      </ScreenHeader>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Caption style={styles.hintText}>
          {scoring ? t('scoringPuzzle') : t('dragPiecesHint')}
        </Caption>

        {/* The panelists asked for the picture being built to sit on the left,
            above the board, so the player can check it while placing pieces
            (Adjustment 3, item 9; layout from the client's mock-up). Tapping it
            opens it full screen; the timer keeps running meanwhile. */}
        <View style={styles.topRow}>
          <View style={styles.referenceBlock}>
            <ZoomableImage
              source={puzzleImage}
              style={styles.referenceThumb}
              openLabel={t('openPictureLabel')}
              zoomHint={t('pictureZoomHint')}
              closeLabel={t('closePictureLabel')}
            />
            <View style={styles.referenceText}>
              <View style={styles.referencePill}>
                <Pill label={t('jigsawReferenceLabel')} icon="eye" tone="neutral" />
              </View>
              <BodyStrong numberOfLines={1}>{t('jigsawReferenceCaption')}</BodyStrong>
              <Caption numberOfLines={1} style={styles.referenceTap}>{t('jigsawReferenceTap')}</Caption>
            </View>
          </View>
          <View style={styles.progressBlock}>
            <Label style={styles.progressLabel}>{t('jigsawProgressLabel')}</Label>
            <H3 style={styles.progressCount}>{placedIds.size}/{pieceCount}</H3>
            <ProgressBar value={placedIds.size / pieceCount} color={cat.base} />
          </View>
        </View>

        <View style={styles.boardWrap}>
          <View
            ref={boardRef}
            onLayout={measureBoard}
            style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}
          >
            {guideOpacity > 0 && (
              <Image
                source={puzzleImage}
                style={[styles.ghostImage, { width: BOARD_SIZE, height: BOARD_SIZE, opacity: guideOpacity }]}
                resizeMode="cover"
              />
            )}

            {/* Faint grid guide so the player can see where each piece belongs */}
            {Array.from({ length: rows * cols }, (_, i) => {
              const r = Math.floor(i / cols);
              const c = i % cols;
              return (
                <View
                  key={`guide-${i}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: c * pieceWidth,
                    top: r * pieceHeight,
                    width: pieceWidth,
                    height: pieceHeight,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: tokens.color.borderStrong,
                  }}
                />
              );
            })}

            {/* Pieces already placed correctly. Still draggable — the player
                can grab one and pull it back off the board to remove it. */}
            {Array.from(placedIds).map((pieceId) => {
              const correctRow = Math.floor(pieceId / cols);
              const correctCol = pieceId % cols;
              const isDragging = dragPieceId === pieceId;
              const panResponder = makePanResponder(pieceId, correctRow, correctCol);
              return (
                <View
                  key={`placed-${pieceId}`}
                  ref={(el) => {
                    pieceRefs.current[pieceId] = el;
                  }}
                  {...panResponder.panHandlers}
                  style={[
                    {
                      position: 'absolute',
                      left: correctCol * pieceWidth - marginX,
                      top: correctRow * pieceHeight - marginY,
                    },
                    isDragging && { opacity: 0 },
                  ]}
                >
                  {renderPieceSvg(pieceId, correctRow, correctCol)}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.trayWrap}>
          {/* Nothing to re-deal with one piece left, and shuffling mid-drag
              would move the tray out from under the finger. */}
          <TouchableOpacity
            style={[styles.shuffleButton, !canShuffle && styles.shuffleButtonDisabled]}
            onPress={reshuffleTray}
            disabled={!canShuffle}
          >
            <Pill label={t('shufflePieces')} icon="refresh" tone="gold" />
          </TouchableOpacity>

          <View style={styles.trayFrame}>
            <View style={styles.trayHeader}>
              <Label style={styles.trayLabel}>{t('jigsawTrayLabel')}</Label>
              <Caption style={styles.trayHint}>{t('jigsawTrayHint')}</Caption>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={dragPieceId === null}
              contentContainerStyle={styles.trayContent}
            >
              {remainingTray.map((pieceId) => {
                const correctRow = Math.floor(pieceId / cols);
                const correctCol = pieceId % cols;
                const isDragging = dragPieceId === pieceId;
                const panResponder = makePanResponder(pieceId, correctRow, correctCol);
                return (
                  <View
                    key={pieceId}
                    ref={(el) => {
                      pieceRefs.current[pieceId] = el;
                    }}
                    {...panResponder.panHandlers}
                    style={[{ width: canvasW, height: canvasH }, isDragging && { opacity: 0 }]}
                  >
                    {renderPieceSvg(pieceId, correctRow, correctCol)}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      {/* Floating drag layer — sits above the board AND the tray, so a
          piece being dragged is never clipped or hidden behind anything. */}
      <View ref={overlayRef} onLayout={measureOverlay} style={styles.dragOverlay} pointerEvents="none">
        {dragPieceId !== null && (
          <Animated.View
            style={[
              styles.dragOverlayPiece,
              {
                width: canvasW,
                height: canvasH,
                left: dragOriginRef.current.x,
                top: dragOriginRef.current.y,
                transform: dragXY.getTranslateTransform(),
              },
            ]}
          >
            {renderPieceSvg(dragPieceId, Math.floor(dragPieceId / cols), dragPieceId % cols)}
          </Animated.View>
        )}
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress} activeOpacity={0.85}>
          <Icon name="chevronLeft" size={16} color={tokens.color.onDark} strokeWidth={3} />
          <BodyStrong style={styles.backButtonText}>{t('backBtn')}</BodyStrong>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.resetButton, !canReset && styles.shuffleButtonDisabled]}
          onPress={resetBoard}
          disabled={!canReset}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('resetPiecesA11y')}
          accessibilityState={{ disabled: !canReset }}
        >
          <Icon name="refresh" size={16} color={tokens.color.ink} strokeWidth={2.6} />
          <BodyStrong>{t('resetPieces')}</BodyStrong>
        </TouchableOpacity>
      </View>

      {/* Picture reveal — a zoomed pop-up of the completed picture, shown
          right after the puzzle is solved and before the results modal. */}
      <Modal visible={phase === 'success' && !revealSeen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <Animated.View style={{ transform: [{ scale: revealScale }], width: '100%' }}>
            <Card style={styles.revealCard}>
              <View style={styles.sheetTitleRow}>
                <View style={[styles.sheetTitleIcon, { backgroundColor: tokens.color.successSoft }]}>
                  <Icon name="puzzle" size={22} color={tokens.color.success} strokeWidth={3} />
                </View>
                <H2 style={styles.successTitle}>{t('pictureComplete')}</H2>
              </View>
              <Image source={puzzleImage} style={styles.revealImage} resizeMode="cover" />
              <BodyStrong style={styles.revealCaption}>{content.title ?? label}</BodyStrong>
              {/* What the admin wrote about this picture in the JuanWise Admin
                  console: the one-line definition, then the mini-lesson behind it.
                  Solving the puzzle is what earns the lesson, so this is the
                  moment to teach rather than before the timer starts.

                  Scrollable because a mini-lesson can run to a few paragraphs and
                  the card must not push its own Continue button off-screen. */}
              {!!content.definition && <Body style={styles.revealDefinition}>{content.definition}</Body>}
              {!!content.context && (
                <ScrollView
                  style={styles.revealLessonScroll}
                  contentContainerStyle={styles.revealLessonContent}
                  showsVerticalScrollIndicator
                >
                  <View style={styles.revealLessonHeadingRow}>
                    <Icon name="book" size={14} color={tokens.color.goldDark} />
                    <Caption style={styles.revealLessonHeading}>{t('learnMoreBtn')}</Caption>
                  </View>
                  <Body style={styles.revealLesson}>{content.context}</Body>
                </ScrollView>
              )}
              <Button
                label={t('continueBtn')}
                onPress={() => setRevealSeen(true)}
                color={cat.base}
                shadowColor={cat.dark}
                style={styles.fullWidthButton}
              />
            </Card>
          </Animated.View>
        </View>
      </Modal>

      {/* Option A: PASSED — puzzle solved before time ran out */}
      <Modal visible={phase === 'success' && revealSeen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <Card style={styles.modalCard}>
            <View style={styles.sheetTitleRow}>
              <View style={[styles.sheetTitleIcon, { backgroundColor: tokens.color.successSoft }]}>
                <Icon name="check" size={22} color={tokens.color.success} strokeWidth={3} />
              </View>
              <H2 style={styles.successTitle}>{t('activityCompleteTitle')}</H2>
            </View>
            <ScoreBadge points={result?.points ?? 0} tone="win" label={t('pointsWord')} />
            <View style={styles.detailBlock}>
              <Body style={styles.detailLine}>{t('detailStudent', { name: studentName })}</Body>
              <View style={styles.detailRow}>
                <Icon name="clock" size={15} color={tokens.color.inkMuted} />
                <Body style={styles.detailLine}>{t('detailTime', { time: formatTime(result?.timeUsed) })}</Body>
              </View>
              <View style={styles.detailRow}>
                <Body style={styles.detailLine}>{t('starsEarnedLabel')}</Body>
                <StarRow earned={result?.stars ?? 0} />
              </View>
              <Body style={styles.detailLine}>{t('detailCategory', { label })}</Body>
              <Body style={styles.detailLine}>{t('detailActivityTypeJigsawPieces', { count: pieceCount })}</Body>
              <Body style={styles.detailLine}>{t('detailPuzzleCount', { num: activityNum, level })}</Body>
              <BodyStrong style={styles.detailLine}>{t('levelScoreLine', { points: levelNow.points, max: levelNow.maxPoints, done: levelNow.done, of: levelNow.of })}</BodyStrong>
              {queued && <Caption style={styles.queuedLine}>{t('offlineQueuedNote')}</Caption>}
            </View>
            <Button
              label={t('proceedNextActivity')}
              onPress={handleContinue}
              color={cat.base}
              shadowColor={cat.dark}
              style={styles.fullWidthButton}
            />
          </Card>
        </View>
      </Modal>

      {/* Option B: FAILED / RED FLAG — timer ran out, not solved (or left early) */}
      <Modal visible={phase === 'failed'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <Card style={styles.modalCard}>
            <View style={styles.sheetTitleRow}>
              <View style={[styles.sheetTitleIcon, { backgroundColor: tokens.color.dangerSoft }]}>
                <Icon name="close" size={22} color={tokens.color.danger} strokeWidth={3} />
              </View>
              <H2 style={styles.timeUpTitle}>{t('activityCompleteIncorrect')}</H2>
            </View>
            <ScoreBadge points={0} tone="loss" label={t('pointsWord')} />
            <View style={styles.detailBlock}>
              <Body style={styles.detailLine}>{t('detailStudent', { name: studentName })}</Body>
              <View style={styles.detailRow}>
                <Icon name="clock" size={15} color={tokens.color.inkMuted} />
                <Body style={styles.detailLine}>{t('detailTime', { time: formatTime(result?.timeUsed) })}</Body>
              </View>
              <View style={styles.detailRow}>
                <Icon name="flag" size={15} color={tokens.color.danger} />
                <BodyStrong style={styles.flagLine}>{t('statusFailedIncomplete')}</BodyStrong>
              </View>
              <Body style={styles.detailLine}>{triesLine(attemptSeq)}</Body>
              <Body style={styles.detailLine}>{t('detailCategory', { label })}</Body>
              <Body style={styles.detailLine}>{t('detailActivityTypeJigsawPieces', { count: pieceCount })}</Body>
              <Body style={styles.detailLine}>{t('detailPuzzleCount', { num: activityNum, level })}</Body>
              <BodyStrong style={styles.detailLine}>{t('levelScoreLine', { points: levelNow.points, max: levelNow.maxPoints, done: levelNow.done, of: levelNow.of })}</BodyStrong>
              {queued && <Caption style={styles.queuedLine}>{t('offlineQueuedNote')}</Caption>}
            </View>
            <Button
              label={t('proceedOtherActivityForm')}
              onPress={handleContinue}
              color={cat.base}
              shadowColor={cat.dark}
              style={styles.fullWidthButton}
            />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerStatsRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs, marginTop: tokens.space.sm },
  headerStatsText: { color: tokens.color.gold, fontFamily: tokens.font.bodyBold },
  scrollContent: { alignItems: 'center', paddingBottom: tokens.space.sm },
  hintText: { textAlign: 'center', marginTop: tokens.space.md, marginBottom: tokens.space.xs, paddingHorizontal: tokens.space.xl },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    width: BOARD_SIZE,
    marginBottom: tokens.space.sm,
  },
  referenceBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  referenceThumb: {
    width: REFERENCE_SIZE,
    height: REFERENCE_SIZE,
    borderRadius: tokens.radius.sm,
    borderWidth: 2,
    borderColor: tokens.color.gold,
  },
  referenceText: { flex: 1, gap: 2 },
  referencePill: { alignSelf: 'flex-start' },
  referenceTap: { color: tokens.color.inkMuted },
  progressBlock: { width: 88, alignItems: 'flex-end', gap: 2 },
  progressLabel: { color: tokens.color.inkMuted },
  progressCount: { color: tokens.color.ink },
  boardWrap: { alignItems: 'center', justifyContent: 'center', marginTop: tokens.space.xs },
  // Border width is left at 2px (not the spec's 3px): piece drop math snaps
  // against `pieceWidth`/`pieceHeight`, computed from BOARD_SIZE against this
  // frame's inner (padding) box, and a wider border shrinks that box. See
  // task-10-report.md for detail.
  board: {
    position: 'relative',
    backgroundColor: tokens.color.surfaceSunken,
    borderWidth: 2,
    borderColor: tokens.color.borderStrong,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
  },
  ghostImage: { position: 'absolute', top: 0, left: 0 },
  trayWrap: { width: '100%', marginTop: tokens.space.lg, minHeight: 10 },
  shuffleButton: {
    alignSelf: 'center',
    marginBottom: tokens.space.sm,
    minHeight: tokens.hit.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shuffleButtonDisabled: { opacity: 0.4 },
  trayFrame: {
    backgroundColor: tokens.color.surfaceSunken,
    borderRadius: tokens.radius.lg,
    borderWidth: 2,
    borderColor: tokens.color.border,
    paddingVertical: tokens.space.sm,
  },
  trayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.space.md,
    marginBottom: tokens.space.xs,
  },
  trayLabel: { color: tokens.color.inkMuted },
  trayHint: { color: tokens.color.inkMuted },
  trayContent: { paddingHorizontal: tokens.space.md, gap: tokens.space.sm, alignItems: 'center' },
  dragOverlay: { ...StyleSheet.absoluteFill, zIndex: 999, elevation: 30 },
  dragOverlayPiece: { position: 'absolute' },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.space.lg,
    marginVertical: tokens.space.lg,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.pill,
    borderWidth: 2,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
    minHeight: tokens.hit.min,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.xs,
    backgroundColor: tokens.color.ink,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.xl,
    borderRadius: tokens.radius.pill,
    minHeight: tokens.hit.min,
  },
  backButtonText: { color: tokens.color.onDark },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: tokens.space.xl },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: tokens.color.ink, opacity: 0.6 },
  modalCard: { width: '100%', alignItems: 'center' },
  revealCard: { width: '100%', alignItems: 'center' },
  revealImage: { width: BOARD_SIZE * 0.85, height: BOARD_SIZE * 0.85, borderRadius: tokens.radius.md, borderWidth: 3, borderColor: tokens.color.gold },
  revealCaption: { color: tokens.color.inkMuted, marginTop: tokens.space.sm },
  revealDefinition: { marginTop: tokens.space.xs, textAlign: 'center' },
  // Capped so a long lesson scrolls inside the card instead of growing it.
  revealLessonScroll: { maxHeight: 150, width: '100%', marginTop: tokens.space.md },
  revealLessonContent: { backgroundColor: tokens.color.goldSoft, borderRadius: tokens.radius.sm, padding: tokens.space.md },
  revealLessonHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs, marginBottom: tokens.space.xs },
  revealLessonHeading: { color: tokens.color.goldDark, fontFamily: tokens.font.bodyBold },
  revealLesson: { color: tokens.color.inkBody },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, marginBottom: tokens.space.lg },
  sheetTitleIcon: { width: 40, height: 40, borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: tokens.color.successInk, textAlign: 'center' },
  timeUpTitle: { color: tokens.color.dangerInk, textAlign: 'center' },
  detailBlock: { width: '100%', marginBottom: tokens.space.lg, gap: tokens.space.xs },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  detailLine: { color: tokens.color.inkBody },
  flagLine: { color: tokens.color.dangerInk },
  queuedLine: { color: tokens.color.inkMuted, fontStyle: 'italic', marginTop: tokens.space.xs },
  fullWidthButton: { width: '100%' },
});