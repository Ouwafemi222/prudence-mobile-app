export type AppThemeName = "prudence" | "neo" | "crimson";

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
  isLight: boolean;
};

const sharedRadius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
};

/** Website brand — default. Primary #5B52EB, accent #A855F7, background #F5F5F5. */
export const prudenceTheme: ThemeTokens = {
  colors: {
    background: "#F5F5F5",
    card: "rgba(255,255,255,0.88)",
    cardMuted: "#F5F3FF",
    surface: "#FFFFFF",
    foreground: "#171717",
    primary: "#5B52EB",
    primaryMuted: "#4F46E5",
    primaryForeground: "#EEF2FF",
    accent: "rgba(168, 85, 247, 0.10)",
    accentStrong: "rgba(168, 85, 247, 0.18)",
    accentForeground: "#A855F7",
    muted: "#A3A3A3",
    mutedForeground: "#404040",
    destructive: "#DC2626",
    destructiveForeground: "#FFFFFF",
    border: "#D4D4D4",
    borderGlow: "rgba(91, 82, 235, 0.28)",
    success: "#16A34A",
    warning: "#F59E0B",
    tabBar: "#FFFFFF",
    overlay: "rgba(23,23,23,0.35)",
  },
  radius: sharedRadius,
  spacing: (n: number) => n * 4,
  gradientTop: "#F5F5F5",
  gradientBottom: "#F5F3FF",
  isLight: true,
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
  isLight: false,
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
  isLight: true,
};

export const appThemes: Record<AppThemeName, ThemeTokens> = {
  prudence: prudenceTheme,
  neo: neoTheme,
  crimson: crimsonTheme,
};
