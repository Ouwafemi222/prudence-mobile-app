import type { ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";

type ButtonVariant = "primary" | "outline" | "destructive" | "ghost";
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
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const variantStyles =
    variant === "primary"
      ? styles.primary
      : variant === "outline"
        ? styles.outline
        : variant === "ghost"
          ? styles.ghost
          : styles.destructive;

  const sizeStyles = size === "sm" ? styles.sm : size === "lg" ? styles.lg : styles.md;
  const textStyle =
    variant === "outline" || variant === "ghost" ? styles.textOutline : styles.textSolid;
  const spinnerColor =
    variant === "outline" || variant === "ghost" ? tokens.colors.primary : tokens.colors.primaryForeground;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      android_ripple={
        Platform.OS === "android"
          ? { color: "rgba(255,255,255,0.18)", foreground: true }
          : undefined
      }
      style={({ pressed }) => [
        styles.base,
        variantStyles,
        sizeStyles,
        disabled ? styles.disabled : null,
        pressed ? { opacity: 0.88 } : null,
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

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    base: {
      borderRadius: tokens.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    primary: {
      backgroundColor: tokens.colors.primary,
      shadowColor: tokens.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.28,
      shadowRadius: 8,
      elevation: 2,
    },
    outline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: tokens.colors.borderGlow,
    },
    ghost: {
      backgroundColor: tokens.colors.accent,
    },
    destructive: {
      backgroundColor: tokens.colors.destructive,
    },
    disabled: {
      opacity: 0.45,
    },
    sm: {
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    md: {
      paddingVertical: 12,
      paddingHorizontal: 18,
    },
    lg: {
      paddingVertical: 15,
      paddingHorizontal: 22,
    },
    textBase: {
      fontWeight: "700",
      fontSize: 15,
      letterSpacing: 0.2,
    },
    textSolid: {
      color: tokens.colors.primaryForeground,
    },
    textOutline: {
      color: tokens.colors.foreground,
    },
  });
