// src/shared/components/ui/text.tsx
import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { tokens } from '@/shared/theme/tokens';

const styles = StyleSheet.create({
  display: { ...tokens.type.display, color: tokens.color.ink },
  h1: { ...tokens.type.h1, color: tokens.color.ink },
  h2: { ...tokens.type.h2, color: tokens.color.ink },
  h3: { ...tokens.type.h3, color: tokens.color.ink },
  body: { ...tokens.type.body, color: tokens.color.inkBody },
  bodyStrong: { ...tokens.type.bodyStrong, color: tokens.color.ink },
  label: { ...tokens.type.label, color: tokens.color.inkFaint, textTransform: 'uppercase' },
  caption: { ...tokens.type.caption, color: tokens.color.inkMuted },
});

const make = (key: keyof typeof styles) =>
  function Typo({ style, ...rest }: TextProps) {
    return <Text style={[styles[key], style]} {...rest} />;
  };

export const Display = make('display');
export const H1 = make('h1');
export const H2 = make('h2');
export const H3 = make('h3');
export const Body = make('body');
export const BodyStrong = make('bodyStrong');
export const Label = make('label');
export const Caption = make('caption');
