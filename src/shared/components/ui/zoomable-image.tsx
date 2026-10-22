// src/shared/components/ui/zoomable-image.tsx
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import { Icon } from './icon';
import { Caption } from './text';
import { tokens } from '@/shared/theme/tokens';

/** 1x fills the screen; each tap steps up, and the third tap comes back. */
const ZOOM_STEPS = [1, 2, 3] as const;

/**
 * A picture that opens full screen and zooms, used for every mini-lesson
 * image. The client evaluation (item 3.3) asked for exactly that: the
 * illustrations carry the detail of the lesson and were previously stuck at
 * thumbnail size with no way to open them.
 *
 * Zooming is a tap that steps through 1x/2x/3x rather than a pinch handler:
 * the app has no gesture-handler root today, a tap is what a child tries
 * first, and the panning a zoomed picture needs is what the two nested scroll
 * views give. On iOS the outer scroll view also pinches natively.
 */
export function ZoomableImage({
  source,
  style,
  resizeMode = 'cover',
  openLabel,
  zoomHint,
  closeLabel,
}: {
  source: ImageSourcePropType;
  /** The thumbnail's style — the full-screen view sizes itself. */
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
  /** Accessibility label for the thumbnail, e.g. "Open the picture". */
  openLabel: string;
  /** The line under the opened picture, e.g. "Tap the picture to zoom". */
  zoomHint: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = ZOOM_STEPS[zoomIndex];
  const { width, height } = Dimensions.get('window');

  const close = () => {
    setOpen(false);
    setZoomIndex(0);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={openLabel}
      >
        <Image source={source} style={style} resizeMode={resizeMode} />
      </Pressable>

      <Modal visible={open} animationType="fade" onRequestClose={close} statusBarTranslucent>
        <View style={styles.viewer}>
          <ScrollView
            maximumZoomScale={ZOOM_STEPS[ZOOM_STEPS.length - 1]}
            minimumZoomScale={1}
            centerContent
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pane}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pane}
            >
              <Pressable
                onPress={() => setZoomIndex((i) => (i + 1) % ZOOM_STEPS.length)}
                accessibilityRole="imagebutton"
                accessibilityLabel={zoomHint}
              >
                <Image
                  source={source}
                  style={{ width: width * zoom, height: height * zoom }}
                  resizeMode="contain"
                />
              </Pressable>
            </ScrollView>
          </ScrollView>

          <Caption style={styles.hint}>{zoomHint}</Caption>

          <Pressable
            style={styles.closeButton}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            hitSlop={12}
          >
            <Icon name="close" size={22} color={tokens.color.onDark} strokeWidth={3} />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: tokens.color.ink },
  pane: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: tokens.space.xl,
    textAlign: 'center',
    color: tokens.color.onDarkMuted,
  },
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
