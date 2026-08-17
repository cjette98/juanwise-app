import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, Image, Animated, PanResponder, Dimensions, TouchableOpacity, Modal, ScrollView, Alert,
} from 'react-native';
import Svg, { Path, Image as SvgImage, ClipPath, Defs, G } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameProgress } from '@/features/learning/context/game-progress-context';
import { useAdminContent } from '@/features/admin/context/admin-content-context';
import ActivityTimer, { ActivityTimerHandle, ActivityTimerResult } from '@/shared/components/activity-timer';
import { starsForMedal, useStudentResults } from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { useLanguage } from '@/shared/i18n/language-context';
import { errorMessage } from '@/shared/api';
import { generateEdgeMap, getPieceEdges, piecePathD } from '@/features/jigsaw/lib/jigsaw-shapes';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toNum } from '@/shared/lib/params';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = SCREEN_WIDTH * 0.82;

// Jigsaw activity timer — 120 seconds max per activity (per spec).
const ACTIVITY_DURATION = 120;

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
// (`POST /results` → juanwise-be `results/scoring.ts`) out of the 120s budget
// this screen reports against. Scoring lives in one place now, so the jigsaw
// results, the leaderboard and the class analytics can never disagree.
// Max per level is still 15 * 6 activities = 90 pts, the same cap as Quiz.
function starsLabel(stars: number) {
  if (stars >= 3) return '⭐⭐⭐ 3 Stars';
  if (stars === 2) return '⭐⭐ 2 Stars';
  if (stars === 1) return '⭐ 1 Star';
  return '— No Star';
}

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
  const { category, label, color, difficulty } = params;
  const level = toNum(params.level, 1);
  const activityNum = toNum(params.activityNum, 1);
  const pieceCount = toNum(params.pieceCount, 6);
  const { completeActivity, failActivity } = useGameProgress();
  const { addResult } = useStudentResults();
  const { name: studentName } = useUser();
  const { getEffectiveCategoryContent } = useAdminContent();
  const { t } = useLanguage();

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
  useEffect(() => {
    placedRef.current = placedIds;
  }, [placedIds]);

  const [dragPieceId, setDragPieceId] = useState<number | null>(null);
  const dragXY = useRef(new Animated.ValueXY()).current;

  const [phase, setPhase] = useState<Phase>('playing');
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const [result, setResult] = useState<(ActivityTimerResult & { stars: number; points: number }) | null>(null);
  const [queued, setQueued] = useState(false);

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
      setResult({
        ...timerResult,
        medal: recorded.medal,
        points: recorded.points,
        stars: starsForMedal(recorded.medal),
      });

      if (recorded.medal) {
        await completeActivity(category, 'jigsaw', level, activityNum);
        setTimeout(() => setPhase('success'), 250);
      } else {
        await failActivity(category, 'jigsaw', level, activityNum);
        setPhase('failed');
      }
    } catch (err) {
      Alert.alert('Hindi Naitala', errorMessage(err, 'Hindi naitala ang resulta mo. Subukan ulit.'));
      phaseRef.current = 'playing';
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
      const timerResult = timerRef.current?.stop();
      if (timerResult) void recordAttempt(timerResult, true);
    }
  };

  const handleExpire = (timerResult: ActivityTimerResult) => {
    if (phaseRef.current !== 'playing') return;
    recordFailedAttempt(timerResult);
  };

  // Leaving the puzzle unsolved (Back button) counts the same as a timeout
  // — a 🚩 red-flag "Needs Retry" — matching Quiz's behavior.
  const handleBackPress = () => {
    if (phase === 'playing') {
      const timerResult = timerRef.current?.stop();
      if (timerResult) recordFailedAttempt(timerResult);
    } else {
      router.back();
    }
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
            const next = new Set(placedRef.current);
            next.add(pieceId);
            placedRef.current = next;
            setPlacedIds(next);
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
      <Path d={pathById[pieceId]} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={opts?.strokeWidth ?? 1.4} />
    </Svg>
  );

  const remainingTray = trayOrder.filter((id) => !placedIds.has(id));
  const canShuffle = phase === 'playing' && dragPieceId === null && remainingTray.length > 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: color }]}>
        <Text style={styles.headerTitle}>{label} — {t('level')} {level}</Text>
        <View style={styles.statsRow}>
          <ActivityTimer
            ref={timerRef}
            durationSeconds={ACTIVITY_DURATION}
            color={color}
            isPaused={phase !== 'playing'}
            onExpire={handleExpire}
          />
          <Text style={styles.statText}>★ {t('activity')} {activityNum}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.hintText}>Drag the pieces below into the board to complete the picture</Text>

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
                    borderColor: 'rgba(140,110,70,0.35)',
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
            <Text style={styles.shuffleButtonText}>🔀 {t('shufflePieces')}</Text>
          </TouchableOpacity>

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

      <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
        <Text style={styles.backButtonText}>{t('backBtn')}</Text>
      </TouchableOpacity>

      {/* Picture reveal — a zoomed pop-up of the completed picture, shown
          right after the puzzle is solved and before the results modal. */}
      <Modal visible={phase === 'success' && !revealSeen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.revealCard, { transform: [{ scale: revealScale }] }]}>
            <Text style={styles.revealTitle}>🧩 Picture Complete!</Text>
            <Image source={puzzleImage} style={styles.revealImage} resizeMode="cover" />
            <Text style={styles.revealCaption}>{content.title ?? label}</Text>
            {/* What the admin wrote about this picture in the JuanWise Admin
                console: the one-line definition, then the mini-lesson behind it.
                Solving the puzzle is what earns the lesson, so this is the
                moment to teach rather than before the timer starts.

                Scrollable because a mini-lesson can run to a few paragraphs and
                the card must not push its own Continue button off-screen. */}
            {!!content.definition && (
              <Text style={styles.revealDefinition}>{content.definition}</Text>
            )}
            {!!content.context && (
              <ScrollView
                style={styles.revealLessonScroll}
                contentContainerStyle={styles.revealLessonContent}
                showsVerticalScrollIndicator
              >
                <Text style={styles.revealLessonHeading}>📖 Alamin</Text>
                <Text style={styles.revealLesson}>{content.context}</Text>
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: color, marginTop: 16 }]}
              onPress={() => setRevealSeen(true)}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Option A: PASSED — puzzle solved before time ran out */}
      <Modal visible={phase === 'success' && revealSeen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.successTitle}>✅ Activity Complete!</Text>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLine}>Student: {studentName}</Text>
              <Text style={styles.detailLine}>⏱ Time: {formatTime(result?.timeUsed)}</Text>
              <Text style={styles.detailLine}>⭐ Stars Earned: {starsLabel(result?.stars ?? 0)}</Text>
              <Text style={styles.detailLine}>💯 Points: {result?.points ?? 0} pts</Text>
              <Text style={styles.detailLine}>📂 Category: {label}</Text>
              <Text style={styles.detailLine}>🎮 Activity Type: Jigsaw Puzzle ({pieceCount} pieces)</Text>
              <Text style={styles.detailLine}>🔢 Activity #: {activityNum} of 6 · Level {level}/5</Text>
              {queued && <Text style={styles.queuedLine}>📶 Offline — ipapadala ang resultang ito pagbalik ng internet.</Text>}
            </View>
            <TouchableOpacity style={[styles.continueButton, { backgroundColor: color }]} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>Proceed to Next Activity</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Option B: FAILED / RED FLAG — timer ran out, not solved (or left early) */}
      <Modal visible={phase === 'failed'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.timeUpTitle}>❌ Activity Complete (Incorrect)</Text>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLine}>Student: {studentName}</Text>
              <Text style={styles.detailLine}>⏱ Time: {formatTime(result?.timeUsed)}</Text>
              <Text style={[styles.detailLine, styles.flagLine]}>🚩 Status: Failed / Incomplete (Needs Retry)</Text>
              <Text style={styles.detailLine}>💯 Points: 0 pts</Text>
              <Text style={styles.detailLine}>📂 Category: {label}</Text>
              <Text style={styles.detailLine}>🎮 Activity Type: Jigsaw Puzzle ({pieceCount} pieces)</Text>
              <Text style={styles.detailLine}>🔢 Activity #: {activityNum} of 6 · Level {level}/5</Text>
              {queued && <Text style={styles.queuedLine}>📶 Offline — ipapadala ang resultang ito pagbalik ng internet.</Text>}
            </View>
            <TouchableOpacity style={[styles.continueButton, { backgroundColor: color }]} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>Proceed to other Activity — maybe you can form it, try it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: { alignItems: 'center', paddingVertical: 14, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
  statText: { color: '#FCD116', fontWeight: 'bold', fontSize: 14 },
  scrollContent: { alignItems: 'center', paddingBottom: 10 },
  hintText: { fontSize: 12.5, color: '#7A6142', textAlign: 'center', marginTop: 12, marginBottom: 4, paddingHorizontal: 24 },
  boardWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  board: { position: 'relative', backgroundColor: '#DDD', borderWidth: 2, borderColor: '#999', overflow: 'hidden' },
  ghostImage: { position: 'absolute', top: 0, left: 0 },
  trayWrap: { width: '100%', marginTop: 18, minHeight: 10 },
  shuffleButton: {
    alignSelf: 'center',
    backgroundColor: '#FCD116',
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#C9A200',
    marginBottom: 10,
  },
  shuffleButtonDisabled: { opacity: 0.4 },
  shuffleButtonText: { color: '#5C3A21', fontWeight: 'bold', fontSize: 13 },
  trayContent: { paddingHorizontal: 16, gap: 10, alignItems: 'center' },
  dragOverlay: { ...StyleSheet.absoluteFill, zIndex: 999, elevation: 30 },
  dragOverlayPiece: { position: 'absolute' },
  backButton: { alignSelf: 'center', backgroundColor: '#5C3A21', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, marginVertical: 14 },
  backButtonText: { color: '#FFF', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#FFFDF7', borderRadius: 20, padding: 20, width: '100%', alignItems: 'center' },
  revealCard: { backgroundColor: '#FFFDF7', borderRadius: 24, padding: 20, width: '100%', alignItems: 'center' },
  revealTitle: { fontSize: 19, fontWeight: 'bold', color: '#3E9E4F', marginBottom: 14, textAlign: 'center' },
  revealImage: { width: BOARD_SIZE * 0.85, height: BOARD_SIZE * 0.85, borderRadius: 16, borderWidth: 3, borderColor: '#FCD116' },
  revealCaption: { fontSize: 14, color: '#7A6142', marginTop: 10, fontWeight: '600' },
  revealDefinition: { fontSize: 13, color: '#5A4A38', marginTop: 6, textAlign: 'center', lineHeight: 18 },
  // Capped so a long lesson scrolls inside the card instead of growing it.
  revealLessonScroll: { maxHeight: 150, width: '100%', marginTop: 12 },
  revealLessonContent: { backgroundColor: '#FFF7DB', borderRadius: 12, padding: 12 },
  revealLessonHeading: { fontSize: 12.5, fontWeight: 'bold', color: '#8A6D00', marginBottom: 4 },
  revealLesson: { fontSize: 13, color: '#4A3F2E', lineHeight: 19 },
  successTitle: { fontSize: 18, fontWeight: 'bold', color: '#3E9E4F', marginBottom: 14, textAlign: 'center' },
  timeUpTitle: { fontSize: 18, fontWeight: 'bold', color: '#C4304A', marginBottom: 14, textAlign: 'center' },
  detailBlock: { width: '100%', marginBottom: 18, gap: 6 },
  detailLine: { fontSize: 13.5, color: '#2B2B2B', lineHeight: 19 },
  flagLine: { color: '#C4304A', fontWeight: 'bold' },
  queuedLine: { fontSize: 12.5, color: '#8A5A2B', fontStyle: 'italic', marginTop: 4 },
  continueButton: { width: '100%', paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  continueButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
});