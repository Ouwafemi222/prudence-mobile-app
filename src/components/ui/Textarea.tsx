import type { StyleProp } from "react-native";
import { TextInput, TextStyle } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";

type TextareaProps = {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  maxLength?: number;
  editable?: boolean;
  style?: StyleProp<TextStyle>;
};

export function Textarea({ value, onChangeText, placeholder, maxLength, editable = true, style }: TextareaProps) {
  const { tokens } = useAppTheme();
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={tokens.colors.muted}
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      maxLength={maxLength}
      multiline
      style={[
        {
          borderWidth: 1,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: tokens.colors.surface,
          color: tokens.colors.foreground,
          minHeight: 160,
          textAlignVertical: "top",
          fontSize: 16,
        },
        style,
      ]}
    />
  );
}
