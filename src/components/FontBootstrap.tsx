import { PropsWithChildren, useEffect } from "react";

/** Load Lato in the background so the first screen is not blocked on fonts. */
export function FontBootstrap({ children }: PropsWithChildren) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const Font = require("expo-font") as typeof import("expo-font");
        const Lato = require("@expo-google-fonts/lato") as {
          Lato_400Regular: number;
          Lato_700Bold: number;
        };
        if (cancelled) return;
        await Font.loadAsync({
          Lato_400Regular: Lato.Lato_400Regular,
          Lato_700Bold: Lato.Lato_700Bold,
        });
      } catch {
        // System font fallback if packages are not installed yet.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
