// src/shared/components/ui/capped-text.tsx
import React from 'react';
import {
  Platform,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
} from 'react-native';

/**
 * How far the phone's font-size setting may stretch text that does not come
 * from a design-system variant: not at all, like the variants in
 * `typography.ts`, so every phone draws the same size (Correction 1, F7).
 */
export const PLAIN_TEXT_MAX_FONT_MULTIPLIER = 1;

/**
 * React Native's `Text` and `TextInput` with that cap as the default. A caller
 * that knows its layout still passes its own `maxFontSizeMultiplier` (or
 * `allowFontScaling={false}`), which wins.
 */
export function Text({ maxFontSizeMultiplier, ...rest }: TextProps) {
  return <NativeText maxFontSizeMultiplier={maxFontSizeMultiplier ?? PLAIN_TEXT_MAX_FONT_MULTIPLIER} {...rest} />;
}

/**
 * For a field whose `onChangeText` rewrites what was typed (upper-cases it,
 * drops characters). Android keyboards with word suggestions hold the current
 * word as "composing" text; when the app swaps the value under it, Gboard and
 * Samsung Keyboard commit that word again, so one tap types two letters
 * (Correction 2, #1). With suggestions off nothing is composing, and the
 * `visible-password` keyboard is the one Android variant that turns them off
 * on every keyboard app. These fields only take letters and digits anyway.
 */
export const NO_SUGGESTIONS_INPUT_PROPS: TextInputProps = {
  autoCorrect: false,
  spellCheck: false,
  autoComplete: 'off',
  importantForAutofill: 'no',
  ...(Platform.OS === 'android' ? { keyboardType: 'visible-password' as const } : null),
};

export function TextInput({ maxFontSizeMultiplier, ...rest }: TextInputProps) {
  return (
    <NativeTextInput maxFontSizeMultiplier={maxFontSizeMultiplier ?? PLAIN_TEXT_MAX_FONT_MULTIPLIER} {...rest} />
  );
}
