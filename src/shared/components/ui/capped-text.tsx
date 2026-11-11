// src/shared/components/ui/capped-text.tsx
import React from 'react';
import {
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

export function TextInput({ maxFontSizeMultiplier, ...rest }: TextInputProps) {
  return (
    <NativeTextInput maxFontSizeMultiplier={maxFontSizeMultiplier ?? PLAIN_TEXT_MAX_FONT_MULTIPLIER} {...rest} />
  );
}
