import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { tokens } from "../../theme/tokens";

type ButtonVariant = "primary" | "outline" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  title?: string;
  children?: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  style,
}: ButtonProps) {
  const variantStyles =
    variant === "primary"
      ? styles.primary
      : variant === "outline"
        ? styles.outline
        : styles.destructive;

  const sizeStyles = size === "sm" ? styles.sm : size === "lg" ? styles.lg : styles.md;
  const textStyle = variant === "outline" ? styles.textOutline : styles.textSolid;
  const spinnerColor = variant === "outline" ? tokens.colors.foreground : tokens.colors.primaryForeground;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles,
        sizeStyles,
        disabled ? styles.disabled : null,
        pressed ? { opacity: 0.9 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[styles.textBase, textStyle]}>{children ?? title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: tokens.colors.primary,
  },
  outline: {
    backgroundColor: tokens.colors.card,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  destructive: {
    backgroundColor: tokens.colors.destructive,
  },
  disabled: {
    opacity: 0.6,
  },
  sm: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  lg: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  textBase: {
    fontWeight: "700",
    fontSize: 14,
    fontFamily: "Georgia",
  },
  textSolid: {
    color: tokens.colors.primaryForeground,
  },
  textOutline: {
    color: tokens.colors.foreground,
  },
});

