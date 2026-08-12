import type { ComponentProps } from "react";
import { useState } from "react";
import { Pressable, StyleProp, StyleSheet, TextInput, TextStyle, View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useKeyboardInputFocus } from "./KeyboardSafe";

type InputProps = {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  /** When true with secureTextEntry, shows an eye toggle to reveal the password */
  passwordToggle?: boolean;
  keyboardType?: ComponentProps<typeof TextInput>["keyboardType"];
  style?: StyleProp<TextStyle>;
} & Omit<
  ComponentProps<typeof TextInput>,
  "value" | "onChangeText" | "secureTextEntry" | "keyboardType" | "style" | "placeholder"
>;

export function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  passwordToggle,
  keyboardType = "default",
  style,
  onFocus,
  returnKeyType = "done",
  ...rest
}: InputProps) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const [visible, setVisible] = useState(false);
  const obscure = Boolean(secureTextEntry && (!passwordToggle || !visible));
  const scrollIntoView = useKeyboardInputFocus();

  const inputEl = (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={tokens.colors.muted}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType={keyboardType}
      secureTextEntry={obscure}
      value={value}
      onChangeText={onChangeText}
      returnKeyType={returnKeyType}
      blurOnSubmit
      underlineColorAndroid="transparent"
      onFocus={(e) => {
        scrollIntoView(e);
        onFocus?.(e);
      }}
      style={[styles.input, passwordToggle && secureTextEntry ? styles.inputWithToggle : null, style]}
      {...rest}
    />
  );

  if (passwordToggle && secureTextEntry) {
    return (
      <View style={styles.row}>
        {inputEl}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
          onPress={() => setVisible((v) => !v)}
          style={({ pressed }) => [styles.toggleBtn, pressed && styles.toggleBtnPressed]}
          hitSlop={8}
        >
          {visible ? (
            <EyeOff size={22} color={tokens.colors.mutedForeground} strokeWidth={2} />
          ) : (
            <Eye size={22} color={tokens.colors.mutedForeground} strokeWidth={2} />
          )}
        </Pressable>
      </View>
    );
  }

  return inputEl;
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.surface,
      paddingRight: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: tokens.colors.surface,
      color: tokens.colors.foreground,
      fontSize: 16,
    },
    inputWithToggle: {
      flex: 1,
      borderWidth: 0,
      minWidth: 0,
    },
    toggleBtn: {
      padding: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    toggleBtnPressed: {
      opacity: 0.7,
    },
  });
