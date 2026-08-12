import type { ComponentProps } from "react";
import { TextInput, type StyleProp, type TextStyle } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useKeyboardInputFocus } from "./KeyboardSafe";

type TextareaProps = {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  maxLength?: number;
  editable?: boolean;
  style?: StyleProp<TextStyle>;
} & Omit<
  ComponentProps<typeof TextInput>,
  "value" | "onChangeText" | "placeholder" | "maxLength" | "editable" | "style" | "multiline"
>;

export function Textarea({
  value,
  onChangeText,
  placeholder,
  maxLength,
  editable = true,
  style,
  onFocus,
  ...rest
}: TextareaProps) {
  const { tokens } = useAppTheme();
  const scrollIntoView = useKeyboardInputFocus();
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={tokens.colors.muted}
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      maxLength={maxLength}
      multiline
      scrollEnabled
      textAlignVertical="top"
      underlineColorAndroid="transparent"
      onFocus={(e) => {
        scrollIntoView(e);
        onFocus?.(e);
      }}
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
      {...rest}
    />
  );
}
