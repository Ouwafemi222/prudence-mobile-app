/**
 * Dark “neo” theme — black canvas, neon mint accent (assistant-style premium UI).
 */
export const tokens = {
  colors: {
    background: "#000000",
    /** Slightly lifted surfaces */
    card: "#111113",
    cardMuted: "#0C0C0E",
    /** Inputs, nested surfaces */
    surface: "#18181B",
    foreground: "#FAFAFA",
    /** Primary neon mint */
    primary: "#3EFFA8",
    primaryMuted: "#1A5C3E",
    /** Text on primary buttons */
    primaryForeground: "#03140C",
    /** Subtle green wash (chips, rows) */
    accent: "rgba(62, 255, 168, 0.08)",
    accentStrong: "rgba(62, 255, 168, 0.16)",
    accentForeground: "#86FFC4",
    muted: "#52525B",
    mutedForeground: "#A1A1AA",
    destructive: "#F87171",
    destructiveForeground: "#450A0A",
    border: "#27272A",
    borderGlow: "rgba(62, 255, 168, 0.35)",
    success: "#4ADE80",
    warning: "#FBBF24",
    tabBar: "#09090B",
    overlay: "rgba(0,0,0,0.65)",
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  spacing: (n: number) => n * 4,
  /** Full-screen welcome / hero gradients */
  gradientTop: "#0A1F14",
  gradientBottom: "#000000",
};

export type Tokens = typeof tokens;
