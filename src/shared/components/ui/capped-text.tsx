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
 * from a design-system variant. Those screens size their own text, so there is
 * no variant to pick a ceiling from; this one sits between the label and body
 * caps in `typography.ts`. Uncapped, the largest setting is roughly three
 * times the base size, which broke the teacher's headings mid-word and grew
 * the login fields past their boxes (evaluation item 3.2).
 */
export const PLAIN_TEXT_MAX_FONT_MULTIPLIER = 1.3;

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
