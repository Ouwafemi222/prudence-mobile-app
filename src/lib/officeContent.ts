import { supabase } from "../integrations/supabase/client";
import type { LucideIcon } from "lucide-react-native";
import { BookOpen, CheckCircle2, Clock, Star, Target } from "lucide-react-native";

export type OfficeRuleSection = {
  id: string;
  category: string;
  items: string[];
  sort_order: number;
};

export type OfficeTimetableSlot = {
  id: string;
  time_label: string;
  activity: string;
  description: string | null;
  sort_order: number;
};

export type OfficeProRequirement = {
  id: string;
  title: string;
  description: string | null;
  icon_key: string;
  details: string[];
  sort_order: number;
};

export type OfficeContentMeta = {
  subtitle: string | null;
  notice_text: string | null;
  footer_text: string | null;
  extra: Record<string, unknown>;
};

const PRO_ICONS: Record<string, LucideIcon> = {
  target: Target,
  book: BookOpen,
  star: Star,
  check: CheckCircle2,
  clock: Clock,
};

export function proRequirementIcon(key: string): LucideIcon {
  return PRO_ICONS[key] ?? Target;
}

export async function fetchOfficeRules(officeId: string) {
  const [sectionsRes, metaRes] = await Promise.all([
    supabase
      .from("office_rule_sections")
      .select("id, category, items, sort_order")
      .eq("office_id", officeId)
      .order("sort_order"),
    supabase
      .from("office_content_meta")
      .select("subtitle, notice_text, footer_text, extra")
      .eq("office_id", officeId)
      .eq("page", "rules")
      .maybeSingle(),
  ]);

  if (sectionsRes.error) throw sectionsRes.error;
  if (metaRes.error) throw metaRes.error;

  return {
    sections: (sectionsRes.data ?? []) as OfficeRuleSection[],
    meta: (metaRes.data ?? null) as OfficeContentMeta | null,
  };
}

export async function fetchOfficeTimetable(officeId: string) {
  const [slotsRes, metaRes] = await Promise.all([
    supabase
      .from("office_timetable_slots")
      .select("id, time_label, activity, description, sort_order")
      .eq("office_id", officeId)
      .order("sort_order"),
    supabase
      .from("office_content_meta")
      .select("subtitle, notice_text, footer_text, extra")
      .eq("office_id", officeId)
      .eq("page", "timetable")
      .maybeSingle(),
  ]);

  if (slotsRes.error) throw slotsRes.error;
  if (metaRes.error) throw metaRes.error;

  const meta = metaRes.data as OfficeContentMeta | null;
  const notes = Array.isArray(meta?.extra?.notes) ? (meta.extra.notes as string[]) : [];

  return {
    slots: (slotsRes.data ?? []) as OfficeTimetableSlot[],
    meta,
    notes,
  };
}

export async function fetchOfficeProRequirements(officeId: string) {
  const [reqsRes, metaRes] = await Promise.all([
    supabase
      .from("office_pro_requirements")
      .select("id, title, description, icon_key, details, sort_order")
      .eq("office_id", officeId)
      .order("sort_order"),
    supabase
      .from("office_content_meta")
      .select("subtitle, notice_text, footer_text, extra")
      .eq("office_id", officeId)
      .eq("page", "pro_requirements")
      .maybeSingle(),
  ]);

  if (reqsRes.error) throw reqsRes.error;
  if (metaRes.error) throw metaRes.error;

  const meta = metaRes.data as OfficeContentMeta | null;
  const privileges = Array.isArray(meta?.extra?.privileges)
    ? (meta.extra.privileges as string[])
    : [];

  return {
    requirements: (reqsRes.data ?? []) as OfficeProRequirement[],
    meta,
    privileges,
  };
}
