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
  themeName: "neo",
  tokens: appThemes.neo,
  setThemeName: async () => {},
});

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeName, setThemeNameState] = useState<AppThemeName>("neo");

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(THEME_KEY)
      .then((saved) => {
        if (!mounted) return;
        if (saved === "neo" || saved === "crimson") {
          setThemeNameState(saved);
        }
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
    } catch {}
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
