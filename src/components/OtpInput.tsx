import React, {useRef} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import {colors, radius} from '../theme';

type OtpInputProps = {
  length?: number;
  value: string;
  setValue: (val: string) => void;
};

export default function OtpInput({length = 6, value, setValue}: OtpInputProps) {
  // ✅ Correct typing: TextInput | null
  const refs = useRef<React.RefObject<TextInput | null>[]>(
    Array.from({length}, () => React.createRef<TextInput>()),
  );

  const onChange = (txt: string, i: number) => {
    const chars = value.split('');
    chars[i] = txt.slice(-1);
    const next = chars.join('');
    setValue(next);

    if (txt && i < length - 1) {
      refs.current[i + 1].current?.focus();
    }
  };

  const onKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    i: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !value[i] && i > 0) {
      refs.current[i - 1].current?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({length}).map((_, i) => (
        <TextInput
          key={i}
          ref={refs.current[i]}
          style={styles.box}
          value={value[i] || ''}
          onChangeText={t => onChange(t, i)}
          onKeyPress={e => onKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          autoCapitalize="none"
          autoCorrect={false}
        />
      ))}
    </View>
  );
}

const BOX = 48;
const styles = StyleSheet.create({
  row: {flexDirection: 'row', justifyContent: 'space-between'},
  box: {
    width: BOX,
    height: BOX,
    borderRadius: radius / 2,
    backgroundColor: '#0c4963',
    borderWidth: 1,
    borderColor: '#37667a',
    textAlign: 'center',
    fontSize: 20,
    color: colors.text,
  },
});
