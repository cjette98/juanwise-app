// src/shared/components/ui/text.tsx
import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { tokens } from '@/shared/theme/tokens';
import { MAX_FONT_MULTIPLIER, typeScale } from '@/shared/theme/typography';

const styles = StyleSheet.create({
  display: { ...typeScale.display, color: tokens.color.ink },
  h1: { ...typeScale.h1, color: tokens.color.ink },
  h2: { ...typeScale.h2, color: tokens.color.ink },
  h3: { ...typeScale.h3, color: tokens.color.ink },
  body: { ...typeScale.body, color: tokens.color.inkBody },
  bodyStrong: { ...typeScale.bodyStrong, color: tokens.color.ink },
  label: { ...typeScale.label, color: tokens.color.inkFaint, textTransform: 'uppercase' },
  caption: { ...typeScale.caption, color: tokens.color.inkMuted },
});

/**
 * Each variant carries its own ceiling on the phone's font-size setting, so a
 * student who turns text up still gets bigger text without a heading pushing
 * its row off the card. A caller that knows its layout can raise or lower the
 * cap by passing `maxFontSizeMultiplier` itself.
 */
const make = (key: keyof typeof styles) =>
  function Typo({ style, maxFontSizeMultiplier, ...rest }: TextProps) {
    return (
      <Text
        style={[styles[key], style]}
        maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_FONT_MULTIPLIER[key]}
        {...rest}
      />
    );
  };

export const Display = make('display');
export const H1 = make('h1');
export const H2 = make('h2');
export const H3 = make('h3');
export const Body = make('body');
export const BodyStrong = make('bodyStrong');
export const Label = make('label');
export const Caption = make('caption');
