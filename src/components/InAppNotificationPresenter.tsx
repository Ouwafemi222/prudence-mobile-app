import { useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { navigateFromAppLink } from "../lib/navigateFromAppLink";
import {
  canLoadExpoNotifications,
  configureNotificationHandler,
  presentAppNotification,
} from "../lib/pushNotifications";

/** Shows THE PRUDENCE-branded banners when a new inbox row arrives. */
export function InAppNotificationPresenter() {
  const { user } = useAuth();
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-live-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { id?: string; title?: string; message?: string; link?: string | null };
          if (!row?.id || seen.current.has(row.id)) return;
          seen.current.add(row.id);
          void presentAppNotification({
            title: row.title || "New update",
            message: row.message || "",
            link: row.link,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!canLoadExpoNotifications()) return;
    let sub: { remove: () => void } | undefined;
    void (async () => {
      await configureNotificationHandler();
      const Notifications = await import("expo-notifications");
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const link = response.notification.request.content.data?.link;
        if (typeof link === "string") navigateFromAppLink(link);
      });
    })();
    return () => sub?.remove();
  }, []);

  return null;
}
