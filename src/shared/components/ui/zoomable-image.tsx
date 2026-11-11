// src/shared/components/ui/zoomable-image.tsx
import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon } from './icon';
import { Body, BodyStrong, Caption } from './text';
import { tokens } from '@/shared/theme/tokens';
import { DOUBLE_TAP_ZOOM, MIN_ZOOM, clampPan, clampZoom, stepZoom } from './zoom-steps';

/**
 * A picture that opens full screen and zooms, used for every mini-lesson
 * image. The client evaluation (item 3.3) asked for that, and Correction 1
 * (F8) found the details still could not be zoomed: zooming was a tap that
 * stepped 1x/2x/3x inside scroll views, and an Android scroll view does not
 * pinch. The viewer now pinches (1x-4x), drags a zoomed picture, double-taps
 * between 1x and 2.5x, and has + and − buttons for anyone who cannot pinch.
 *
 * `details` puts the lesson's own words under the picture, so the opened
 * view shows the whole mini-lesson rather than the picture alone.
 */
export function ZoomableImage({
  source,
  style,
  containerStyle,
  resizeMode = 'cover',
  openLabel,
  zoomHint,
  closeLabel,
  zoomInLabel,
  zoomOutLabel,
  details,
}: {
  source: ImageSourcePropType;
  /** The thumbnail's style — the full-screen view sizes itself. */
  style?: StyleProp<ImageStyle>;
  /**
   * The tappable wrapper's style. A thumbnail sized as a share of its parent
   * (`width: '100%'`) needs the wrapper to take that width first: inside a
   * parent that centres its children the wrapper otherwise shrinks to nothing.
   */
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain';
  /** Accessibility label for the thumbnail, e.g. "Open the picture". */
  openLabel: string;
  /** The line under the opened picture, e.g. "Pinch or double-tap to zoom". */
  zoomHint: string;
  closeLabel: string;
  zoomInLabel?: string;
  zoomOutLabel?: string;
  /** Shown under the opened picture: the lesson it illustrates. */
  details?: { title: string; text: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        style={containerStyle}
        onPress={() => setOpen(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={openLabel}
      >
        <Image source={source} style={style} resizeMode={resizeMode} />
      </Pressable>

      <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        {/* A Modal is its own native root, so gestures need their own handler root inside it. */}
        <GestureHandlerRootView style={styles.viewer}>
          {open && (
            <ZoomStage
              source={source}
              zoomHint={zoomHint}
              zoomInLabel={zoomInLabel ?? '+'}
              zoomOutLabel={zoomOutLabel ?? '−'}
            />
          )}

          {details && (
            <ScrollView style={styles.details} contentContainerStyle={styles.detailsContent}>
              <BodyStrong style={styles.detailsTitle}>{details.title}</BodyStrong>
              <Body style={styles.detailsText}>{details.text}</Body>
            </ScrollView>
          )}

          <Pressable
            style={styles.closeButton}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            hitSlop={12}
          >
            <Icon name="close" size={22} color={tokens.color.onDark} strokeWidth={3} />
          </Pressable>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}

/** The opened picture. Mounted only while the viewer is open, so it always starts at 1x. */
function ZoomStage({
  source,
  zoomHint,
  zoomInLabel,
  zoomOutLabel,
}: {
  source: ImageSourcePropType;
  zoomHint: string;
  zoomInLabel: string;
  zoomOutLabel: string;
}) {
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const frameW = useSharedValue(0);
  const frameH = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    frameW.value = e.nativeEvent.layout.width;
    frameH.value = e.nativeEvent.layout.height;
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = clampZoom(startScale.value * e.scale);
      x.value = clampPan(x.value, scale.value, frameW.value);
      y.value = clampPan(y.value, scale.value, frameH.value);
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((e) => {
      x.value = clampPan(startX.value + e.translationX, scale.value, frameW.value);
      y.value = clampPan(startY.value + e.translationY, scale.value, frameH.value);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = scale.value > MIN_ZOOM ? MIN_ZOOM : DOUBLE_TAP_ZOOM;
      scale.value = withTiming(next);
      x.value = withTiming(clampPan(x.value, next, frameW.value));
      y.value = withTiming(clampPan(y.value, next, frameH.value));
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const zoomBy = (direction: 1 | -1) => {
    const next = stepZoom(scale.value, direction);
    scale.value = withTiming(next);
    x.value = withTiming(clampPan(x.value, next, frameW.value));
    y.value = withTiming(clampPan(y.value, next, frameH.value));
  };

  const pictureStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <View style={styles.stage}>
      <GestureDetector gesture={gesture}>
        <View style={styles.frame} onLayout={onLayout} collapsable={false}>
          <Animated.Image source={source} style={[styles.picture, pictureStyle]} resizeMode="contain" />
        </View>
      </GestureDetector>

      <View style={styles.toolbar}>
        <Pressable
          style={styles.zoomButton}
          onPress={() => zoomBy(-1)}
          accessibilityRole="button"
          accessibilityLabel={zoomOutLabel}
          hitSlop={8}
        >
          <Caption style={styles.zoomButtonText}>−</Caption>
        </Pressable>
        <Caption style={styles.hint}>{zoomHint}</Caption>
        <Pressable
          style={styles.zoomButton}
          onPress={() => zoomBy(1)}
          accessibilityRole="button"
          accessibilityLabel={zoomInLabel}
          hitSlop={8}
        >
          <Caption style={styles.zoomButtonText}>+</Caption>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: tokens.color.ink },
  stage: { flex: 1, paddingTop: tokens.space.xxl + tokens.space.md + tokens.hit.min },
  frame: { flex: 1, overflow: 'hidden' },
  picture: { width: '100%', height: '100%' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.md,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.lg,
  },
  hint: { flexShrink: 1, textAlign: 'center', color: tokens.color.onDarkMuted },
  zoomButton: {
    width: tokens.hit.min,
    height: tokens.hit.min,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.onDarkChip,
  },
  zoomButtonText: {
    color: tokens.color.onDark,
    fontFamily: tokens.font.bodyBlack,
    fontSize: tokens.type.h2.fontSize,
    lineHeight: tokens.type.h2.lineHeight,
  },
  details: {
    flexGrow: 0,
    maxHeight: '38%',
    backgroundColor: tokens.color.surface,
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
  },
  detailsContent: { padding: tokens.space.lg, paddingBottom: tokens.space.xxl, gap: tokens.space.xs },
  detailsTitle: { color: tokens.color.ink },
  detailsText: { color: tokens.color.inkBody },
  closeButton: {
    position: 'absolute',
    top: tokens.space.xxl + tokens.space.md,
    right: tokens.space.lg,
    width: tokens.hit.min,
    height: tokens.hit.min,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.onDarkChip,
  },
});
