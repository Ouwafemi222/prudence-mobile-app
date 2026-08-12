import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getNigeriaDaypartGreeting } from "../lib/nigeriaTime";

/** Live WAT greeting — refreshes on focus and every 30s while the screen is open. */
export function useNigeriaTimeGreeting(name?: string | null) {
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      const id = setInterval(() => setNow(new Date()), 30_000);
      return () => clearInterval(id);
    }, []),
  );

  return getNigeriaDaypartGreeting(now, name);
}
