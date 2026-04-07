import { useEffect, useState, type ComponentType } from "react";
import { InteractionManager } from "react-native";

/**
 * `react-native-calendars` imports `commons/constants`, which calls `Dimensions.get("window")` at
 * module load. That pulls in `Dimensions` before the native runtime is ready and triggers
 * `getConstants` of null on some Expo / Android startups. Load the package only after interactions.
 */
export function useDeferredReactNativeCalendar(): ComponentType<Record<string, unknown>> | null {
  const [Calendar, setCalendar] = useState<ComponentType<Record<string, unknown>> | null>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      // Extra tick: avoids racing native Dimensions init on cold start (Expo Go / Android).
      timeoutId = setTimeout(() => {
        try {
          const mod = require("react-native-calendars") as typeof import("react-native-calendars");
          setCalendar(() => mod.Calendar as ComponentType<Record<string, unknown>>);
        } catch {
          /* leave null */
        }
      }, 0);
    });
    return () => {
      task.cancel();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return Calendar;
}
