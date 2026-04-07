import { useEffect, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useAuth } from "../contexts/AuthContext";
import { flushSuggestionOutbox } from "../lib/suggestionOutbox";

const DEBOUNCE_MS = 2000;

/**
 * When the device comes online, send any suggestion messages that were queued while offline.
 */
export function SuggestionOutboxSync() {
  const { user } = useAuth();
  const lastFlushRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    void flushSuggestionOutbox(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    const unsub = NetInfo.addEventListener((state) => {
      if (!state.isConnected) return;
      const now = Date.now();
      if (now - lastFlushRef.current < DEBOUNCE_MS) return;
      lastFlushRef.current = now;
      void flushSuggestionOutbox(uid);
    });
    return unsub;
  }, [user?.id]);

  return null;
}
