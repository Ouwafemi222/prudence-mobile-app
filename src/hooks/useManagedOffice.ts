import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";

export type ManagedOffice = { id: string; slug: string; name: string };

export function useManagedOffice(selectedSlug?: string | null) {
  const { office, officeId, isSuperAdmin, isOfficeAdmin } = useAuth();
  const [offices, setOffices] = useState<ManagedOffice[]>([]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void supabase
      .from("offices")
      .select("id, slug, name")
      .order("name")
      .then(({ data }) => setOffices((data || []) as ManagedOffice[]));
  }, [isSuperAdmin]);

  const managed = useMemo(() => {
    if (isSuperAdmin && selectedSlug) {
      return offices.find((o) => o.slug === selectedSlug) ?? office;
    }
    return office;
  }, [isSuperAdmin, selectedSlug, offices, office]);

  return {
    offices,
    managedOffice: managed,
    managedOfficeId: managed?.id ?? officeId,
    canManage: isSuperAdmin || isOfficeAdmin,
    isManagingOtherOffice: Boolean(isSuperAdmin && managed && office && managed.id !== office.id),
  };
}
