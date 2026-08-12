import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Live postgres subscriptions that refetch pages in the background.
 * Off by default — reporting/forms apps should load on visit and after save, not chat-style sync.
 */
export const REALTIME_SYNC_ENABLED = false;

export const REALTIME_SYNC_EVENT = "prudence:realtime-sync";

export type RealtimeTable =
  | "daily_activities"
  | "weekly_reports"
  | "monthly_goals"
  | "daily_todos"
  | "notifications"
  | "profiles"
  | "activity_comments"
  | "activity_section_verifications";

type RealtimeSyncDetail = {
  table: RealtimeTable;
  version: number;
};

type RealtimeSyncContextValue = {
  version: number;
  lastTable: RealtimeTable | null;
};

const RealtimeSyncContext = createContext<RealtimeSyncContextValue>({
  version: 0,
  lastTable: null,
});

const REALTIME_TABLES: RealtimeTable[] = [
  "daily_activities",
  "weekly_reports",
  "monthly_goals",
  "daily_todos",
  "notifications",
  "profiles",
  "activity_comments",
  "activity_section_verifications",
];

/** Bump global sync version and dispatch a window event (for pages using manual fetch). */
function emitRealtimeSync(table: RealtimeTable, version: number) {
  window.dispatchEvent(
    new CustomEvent<RealtimeSyncDetail>(REALTIME_SYNC_EVENT, {
      detail: { table, version },
    }),
  );
}

const BUMP_DEBOUNCE_MS = 500;
const REFRESH_DEBOUNCE_MS = 400;

const disabledSyncValue: RealtimeSyncContextValue = { version: 0, lastTable: null };

export function RealtimeSyncProvider({ children }: { children: ReactNode }) {
  if (!REALTIME_SYNC_ENABLED) {
    return (
      <RealtimeSyncContext.Provider value={disabledSyncValue}>
        {children}
      </RealtimeSyncContext.Provider>
    );
  }

  const { user, refreshProfile } = useAuth();
  const [version, setVersion] = useState(0);
  const [lastTable, setLastTable] = useState<RealtimeTable | null>(null);
  const versionRef = useRef(0);
  const bumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTableRef = useRef<RealtimeTable | null>(null);

  const bump = useCallback((table: RealtimeTable) => {
    pendingTableRef.current = table;
    if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current);
    bumpTimerRef.current = setTimeout(() => {
      bumpTimerRef.current = null;
      const t = pendingTableRef.current ?? table;
      versionRef.current += 1;
      const v = versionRef.current;
      setVersion(v);
      setLastTable(t);
      emitRealtimeSync(t, v);
    }, BUMP_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`app-sync:${user.id}`);

    for (const table of REALTIME_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => bump(table),
      );
    }

    channel.subscribe();

    return () => {
      if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id, bump]);

  useEffect(() => {
    if (!user?.id || lastTable !== "profiles") return;
    refreshProfile();
  }, [user?.id, lastTable, version, refreshProfile]);

  const value = useMemo(() => ({ version, lastTable }), [version, lastTable]);

  return (
    <RealtimeSyncContext.Provider value={value}>{children}</RealtimeSyncContext.Provider>
  );
}

export function useRealtimeSync() {
  return useContext(RealtimeSyncContext);
}

/**
 * Re-run `onRefresh` when any relevant realtime change fires.
 * Pass `tables` to limit refreshes to specific tables (omit for all).
 */
export function useRealtimeRefresh(
  onRefresh: () => void,
  tables?: RealtimeTable[],
) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!REALTIME_SYNC_ENABLED) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<RealtimeSyncDetail>).detail;
      if (tables?.length && detail?.table && !tables.includes(detail.table)) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        onRefreshRef.current();
      }, REFRESH_DEBOUNCE_MS);
    };
    window.addEventListener(REALTIME_SYNC_EVENT, handler);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      window.removeEventListener(REALTIME_SYNC_EVENT, handler);
    };
  }, [tables]);
}
