export type AppThemeName = "neo" | "crimson";

export type ThemeTokens = {
  colors: {
    background: string;
    card: string;
    cardMuted: string;
    surface: string;
    foreground: string;
    primary: string;
    primaryMuted: string;
    primaryForeground: string;
    accent: string;
    accentStrong: string;
    accentForeground: string;
    muted: string;
    mutedForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    borderGlow: string;
    success: string;
    warning: string;
    tabBar: string;
    overlay: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  spacing: (n: number) => number;
  gradientTop: string;
  gradientBottom: string;
};

const sharedRadius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
};

export const neoTheme: ThemeTokens = {
  colors: {
    background: "#000000",
    card: "#111113",
    cardMuted: "#0C0C0E",
    surface: "#18181B",
    foreground: "#FAFAFA",
    primary: "#3EFFA8",
    primaryMuted: "#1A5C3E",
    primaryForeground: "#03140C",
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
  radius: sharedRadius,
  spacing: (n: number) => n * 4,
  gradientTop: "#0A1F14",
  gradientBottom: "#000000",
};

export const crimsonTheme: ThemeTokens = {
  colors: {
    background: "#FFF7FA",
    card: "#FFFFFF",
    cardMuted: "#FFF1F6",
    surface: "#FFFFFF",
    foreground: "#2B0A16",
    primary: "#C2185B",
    primaryMuted: "#8E1744",
    primaryForeground: "#FFFFFF",
    accent: "rgba(194, 24, 91, 0.08)",
    accentStrong: "rgba(194, 24, 91, 0.16)",
    accentForeground: "#8E1744",
    muted: "#B78A9D",
    mutedForeground: "#7D4E63",
    destructive: "#D32F2F",
    destructiveForeground: "#3D0000",
    border: "rgba(194, 24, 91, 0.16)",
    borderGlow: "rgba(194, 24, 91, 0.28)",
    success: "#2E7D32",
    warning: "#F9A825",
    tabBar: "#FFFFFF",
    overlay: "rgba(43,10,22,0.28)",
  },
  radius: sharedRadius,
  spacing: (n: number) => n * 4,
  gradientTop: "#C2185B",
  gradientBottom: "#FFF7FA",
};

export const appThemes: Record<AppThemeName, ThemeTokens> = {
  neo: neoTheme,
  crimson: crimsonTheme,
};
