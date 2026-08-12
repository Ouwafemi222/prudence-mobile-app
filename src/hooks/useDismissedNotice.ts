import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const storageKey = (noticeId: string) => `dismissed_notice_${noticeId}`;

export function useDismissedNotice(noticeId: string) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(storageKey(noticeId))
      .then((value) => {
        if (mounted && value === "1") setDismissed(true);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [noticeId]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    AsyncStorage.setItem(storageKey(noticeId), "1").catch(() => {});
  }, [noticeId]);

  return { dismissed, dismiss };
}
