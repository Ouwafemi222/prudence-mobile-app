import { useEffect, useState, type ComponentType } from "react";
import { InteractionManager } from "react-native";
import type { ColorValue } from "react-native";

type DeferredStatusBarProps = {
  style: "auto" | "inverted" | "light" | "dark";
  backgroundColor?: ColorValue;
};

/**
 * Defer expo-status-bar (and RN StatusBar native getConstants) until after the bridge is ready.
 */
export function DeferredExpoStatusBar(props: DeferredStatusBarProps) {
  const [Bar, setBar] = useState<ComponentType<DeferredStatusBarProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      raf = requestAnimationFrame(() => {
        timeoutId = setTimeout(() => {
          if (cancelled) return;
          try {
            const mod = require("expo-status-bar") as typeof import("expo-status-bar");
            setBar(() => mod.StatusBar as ComponentType<DeferredStatusBarProps>);
          } catch {
            /* status bar optional */
          }
        }, 0);
      });
    });
    return () => {
      cancelled = true;
      task.cancel();
      cancelAnimationFrame(raf);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (!Bar) return null;
  return <Bar {...props} />;
}
