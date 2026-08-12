import { useCallback, useState } from "react";

const storageKey = (noticeId: string) => `dismissed_notice_${noticeId}`;

export function useDismissedNotice(noticeId: string) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey(noticeId)) === "1";
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(storageKey(noticeId), "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, [noticeId]);

  return { dismissed, dismiss };
}
