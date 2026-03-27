import type { StyleProp } from "react-native";
import { TextInput, TextStyle } from "react-native";
import { tokens } from "../../theme/tokens";

type TextareaProps = {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  maxLength?: number;
  editable?: boolean;
  style?: StyleProp<TextStyle>;
};

export function Textarea({ value, onChangeText, placeholder, maxLength, editable = true, style }: TextareaProps) {
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={tokens.colors.muted}
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      maxLength={maxLength}
      multiline
      style={[{
        borderWidth: 1,
        borderColor: tokens.colors.border,
        borderRadius: tokens.radius.md,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: tokens.colors.card,
        color: tokens.colors.foreground,
        minHeight: 160,
        textAlignVertical: "top",
      }, style]}
    />
  );
}

