/** User-visible message from Supabase / unknown errors */
export function formatSupabaseError(e: unknown): string {
  if (e == null) return "Something went wrong.";
  if (typeof e === "string") return e;
  const err = e as Error & { details?: string; hint?: string };
  const msg = "message" in err && err.message ? err.message : "";
  const details = "details" in err && err.details ? String(err.details) : "";
  const hint = "hint" in err && err.hint ? String(err.hint) : "";
  const parts = [msg, details, hint].filter(Boolean);
  return parts.length ? parts.join(" — ") : "Something went wrong.";
}
