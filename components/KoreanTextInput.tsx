import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';

export interface KoreanTextInputRef {
  getValue: () => string;
  setValue: (text: string) => void;
  clear: () => void;
  focus: () => void;
}

interface KoreanTextInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  defaultValue?: string;
}

/**
 * 한글 입력 시 자모 분리 문제를 해결하는 TextInput 컴포넌트
 * React Native의 controlled TextInput은 한글 IME와 충돌하여 자모가 분리되는 문제가 있음
 * 이 컴포넌트는 uncontrolled 방식을 사용하여 이 문제를 해결함
 *
 * 사용법:
 * const inputRef = useRef<KoreanTextInputRef>(null);
 * const value = inputRef.current?.getValue() || '';
 * inputRef.current?.setValue('새 텍스트');
 * inputRef.current?.clear();
 */
const KoreanTextInput = forwardRef<KoreanTextInputRef, KoreanTextInputProps>(
  ({ defaultValue = '', style, ...props }, ref) => {
    const inputRef = useRef<TextInput>(null);
    const currentValueRef = useRef<string>(defaultValue);

    // 사용자 입력을 추적하는 핸들러
    const handleChangeText = (text: string) => {
      currentValueRef.current = text;
    };

    useImperativeHandle(ref, () => ({
      getValue: () => {
        // currentValueRef가 항상 최신 값을 가지므로 이를 우선 사용
        // _lastNativeText는 백업으로만 사용
        if (currentValueRef.current !== '') {
          return currentValueRef.current;
        }
        const nativeText = (inputRef.current as any)?._lastNativeText;
        if (nativeText !== undefined) {
          return nativeText;
        }
        return currentValueRef.current;
      },
      setValue: (text: string) => {
        currentValueRef.current = text;
        inputRef.current?.setNativeProps({ text });
        // _lastNativeText도 수동으로 설정
        if (inputRef.current) {
          (inputRef.current as any)._lastNativeText = text;
        }
      },
      clear: () => {
        currentValueRef.current = '';
        inputRef.current?.clear();
        if (inputRef.current) {
          (inputRef.current as any)._lastNativeText = '';
        }
      },
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    return (
      <TextInput
        ref={inputRef}
        defaultValue={defaultValue}
        onChangeText={handleChangeText}
        style={[styles.input, style]}
        placeholderTextColor="#9ca3af"
        {...props}
      />
    );
  }
);

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1f2937',
  },
});

export default KoreanTextInput;
