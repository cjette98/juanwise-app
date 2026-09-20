import React from 'react';
import { StyleSheet, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Icon } from '@/shared/components/ui';

/**
 * A TextInput with an inline ✕ that blanks the field, shown only once it has
 * text. `style`'s marginBottom moves to the wrapper (not the input itself) so
 * the ✕ can be vertically centered against the input's own box.
 */
export function ClearableTextInput({ value, onChangeText, style, multiline, ...rest }: TextInputProps) {
  const hasValue = !!value;
  const flatStyle = StyleSheet.flatten(style) ?? {};
  const { marginBottom, ...inputStyle } = flatStyle;

  return (
    <View style={[styles.wrapper, { marginBottom: marginBottom ?? 0 }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        style={[inputStyle, hasValue && styles.withClearPadding]}
        {...rest}
      />
      {hasValue && (
        <TouchableOpacity
          style={[styles.clearButton, multiline && styles.clearButtonMultiline]}
          onPress={() => onChangeText?.('')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="I-clear ang field"
        >
          <Icon name="close" size={14} color="#8E8E93" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', justifyContent: 'center' },
  withClearPadding: { paddingRight: 32 },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Multiline fields grow downward, so pin the ✕ to the top-right corner
  // instead of vertically centering it across the whole (variable) height.
  clearButtonMultiline: { top: 10, bottom: undefined },
});
