import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardTypeOptions,
  NativeSyntheticEvent,
  TextInputChangeEventData,
} from "react-native";
import { colors, spacing } from "../theme";

interface AppTextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
}

export default function AppTextField({
  label,
  value,
  onChangeText,
  secure = false,
  keyboardType,
  placeholder,
}: AppTextFieldProps) {
  const [hidden, setHidden] = useState<boolean>(secure);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={hidden}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
        />
       
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing(2) },
  label: { color: colors.text, marginBottom: 6, fontSize: 16 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomColor: "#9fb9c8",
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  input: { flex: 1, color: colors.text, fontSize: 16 },
});
