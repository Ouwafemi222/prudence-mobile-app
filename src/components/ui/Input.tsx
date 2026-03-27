import { StyleProp, StyleSheet, TextInput, TextStyle } from "react-native";
import { tokens } from "../../theme/tokens";

type InputProps = {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  style?: StyleProp<TextStyle>;
};

export function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = "default",
  style,
}: InputProps) {
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={tokens.colors.muted}
      autoCapitalize="none"
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      value={value}
      onChangeText={onChangeText}
      style={[styles.input, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: tokens.colors.card,
    color: tokens.colors.foreground,
  },
});

