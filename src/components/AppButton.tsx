import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from "react-native";
import { colors, radius, spacing } from "../theme";

interface AppButtonProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AppButton({
  title,
  onPress,
  disabled = false,
  style,
}: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        pressed && { opacity: 0.9 },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.btn,
    paddingVertical: spacing(1.5),
    borderRadius: 25,
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: colors.border,
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  disabled: { opacity: 0.5 },
  title: { fontWeight: "900", color: "#FFFFFF", fontSize: 15, letterSpacing: 0.5 },
});
