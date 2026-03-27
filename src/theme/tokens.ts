export const tokens = {
  colors: {
    background: "#F5F5F5",
    foreground: "#171717",
    card: "#FAFAFA",
    primary: "#4E50E7",
    primaryForeground: "#EDF0FF",
    accent: "#F2EFFF",
    accentForeground: "#7A5EF6",
    muted: "#A1A1A1",
    mutedForeground: "#404040",
    destructive: "#DC2626",
    border: "#D4D4D4",
    success: "#16A34A",
    warning: "#F59E0B",
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
  },
  spacing: (n: number) => n * 4,
};

export type Tokens = typeof tokens;
