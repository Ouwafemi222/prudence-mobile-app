import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppThemeName, ThemeTokens } from "../theme/themes";
import { appThemes } from "../theme/themes";

const THEME_KEY = "pp.theme";

type ThemeContextValue = {
  themeName: AppThemeName;
  tokens: ThemeTokens;
  setThemeName: (name: AppThemeName) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  themeName: "prudence",
  tokens: appThemes.prudence,
  setThemeName: async () => {},
});

function isThemeName(value: string | null): value is AppThemeName {
  return value === "prudence" || value === "neo" || value === "crimson";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeName, setThemeNameState] = useState<AppThemeName>("prudence");

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(THEME_KEY)
      .then((saved) => {
        if (!mounted) return;
        if (isThemeName(saved)) setThemeNameState(saved);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const setThemeName = async (name: AppThemeName) => {
    setThemeNameState(name);
    try {
      await AsyncStorage.setItem(THEME_KEY, name);
    } catch {
      // ignore
    }
  };

  const value = useMemo(
    () => ({
      themeName,
      tokens: appThemes[themeName],
      setThemeName,
    }),
    [themeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
