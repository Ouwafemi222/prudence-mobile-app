import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";

/** Super admins may query cross-office; everyone else scopes to their office. */
export function scopeToUserOffice<T extends PostgrestFilterBuilder<any, any, any, any, any>>(
  query: T,
  officeId: string | null | undefined,
  isSuperAdmin: boolean,
): T {
  if (!isSuperAdmin && officeId) {
    return query.eq("office_id", officeId) as T;
  }
  return query;
}
