import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ManagedOffice = { id: string; slug: string; name: string };

/** Office context for /office-admin — super_admin may switch to any office via ?office=slug */
export function useManagedOffice() {
  const { profile, office: homeOffice, isSuperAdmin, isOfficeAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const officeSlugParam = searchParams.get("office");

  const [managedOffice, setManagedOffice] = useState<ManagedOffice | null>(null);
  const [allOffices, setAllOffices] = useState<ManagedOffice[]>([]);
  const [loading, setLoading] = useState(true);

  const setOfficeSlug = useCallback(
    (slug: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("office", slug);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const loadOffices = useCallback(async () => {
    if (!isSuperAdmin && !isOfficeAdmin) {
      setManagedOffice(null);
      setAllOffices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (isSuperAdmin) {
        const { data: offices, error } = await supabase
          .from("offices")
          .select("id, slug, name")
          .order("name");
        if (error) throw error;

        const list = offices ?? [];
        setAllOffices(list);

        const slug = officeSlugParam ?? homeOffice?.slug ?? list[0]?.slug;
        const selected = list.find((o) => o.slug === slug) ?? list[0] ?? null;
        setManagedOffice(selected);

        if (selected && officeSlugParam !== selected.slug) {
          setOfficeSlug(selected.slug);
        }
      } else if (homeOffice) {
        setManagedOffice(homeOffice);
        setAllOffices([homeOffice]);
      } else {
        setManagedOffice(null);
        setAllOffices([]);
      }
    } catch (e) {
      console.error("Failed to load managed office:", e);
      setManagedOffice(null);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, isOfficeAdmin, officeSlugParam, homeOffice, setOfficeSlug]);

  useEffect(() => {
    void loadOffices();
  }, [loadOffices]);

  const refreshManagedOffice = useCallback(async () => {
    if (!managedOffice?.id) return;
    const { data, error } = await supabase
      .from("offices")
      .select("id, slug, name")
      .eq("id", managedOffice.id)
      .maybeSingle();
    if (!error && data) setManagedOffice(data);
  }, [managedOffice?.id]);

  const isManagingOtherOffice =
    isSuperAdmin && Boolean(managedOffice?.id && managedOffice.id !== profile?.office_id);

  return {
    managedOfficeId: managedOffice?.id ?? null,
    managedOffice,
    allOffices,
    setOfficeSlug,
    refreshManagedOffice,
    loading,
    isManagingOtherOffice,
    canSwitchOffice: isSuperAdmin && allOffices.length > 1,
  };
}
