import { supabase } from "@/integrations/supabase/client";
import type {
  OfficeContentMeta,
  OfficeProRequirement,
  OfficeRuleSection,
  OfficeTimetableSlot,
} from "@/lib/officeContent";

type ContentPage = "rules" | "timetable" | "pro_requirements";

export async function upsertOfficeContentMeta(
  officeId: string,
  page: ContentPage,
  meta: Partial<OfficeContentMeta> & { extra?: Record<string, unknown> },
) {
  const { error } = await supabase.from("office_content_meta").upsert(
    {
      office_id: officeId,
      page,
      subtitle: meta.subtitle ?? null,
      notice_text: meta.notice_text ?? null,
      footer_text: meta.footer_text ?? null,
      extra: meta.extra ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "office_id,page" },
  );
  if (error) throw error;
}

export async function saveOfficeRuleSections(
  officeId: string,
  sections: Array<{ id?: string; category: string; items: string[]; sort_order: number }>,
) {
  const { data: existing, error: fetchError } = await supabase
    .from("office_rule_sections")
    .select("id")
    .eq("office_id", officeId);
  if (fetchError) throw fetchError;

  const keepIds = new Set(sections.filter((s) => s.id).map((s) => s.id!));
  const toDelete = (existing ?? []).filter((r) => !keepIds.has(r.id)).map((r) => r.id);

  if (toDelete.length > 0) {
    const { error } = await supabase.from("office_rule_sections").delete().in("id", toDelete);
    if (error) throw error;
  }

  for (const section of sections) {
    if (section.id) {
      const { error } = await supabase
        .from("office_rule_sections")
        .update({
          category: section.category,
          items: section.items,
          sort_order: section.sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq("id", section.id)
        .eq("office_id", officeId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("office_rule_sections").insert({
        office_id: officeId,
        category: section.category,
        items: section.items,
        sort_order: section.sort_order,
      });
      if (error) throw error;
    }
  }
}

export async function saveOfficeTimetableSlots(
  officeId: string,
  slots: Array<{
    id?: string;
    time_label: string;
    activity: string;
    description: string | null;
    sort_order: number;
  }>,
) {
  const { data: existing, error: fetchError } = await supabase
    .from("office_timetable_slots")
    .select("id")
    .eq("office_id", officeId);
  if (fetchError) throw fetchError;

  const keepIds = new Set(slots.filter((s) => s.id).map((s) => s.id!));
  const toDelete = (existing ?? []).filter((r) => !keepIds.has(r.id)).map((r) => r.id);

  if (toDelete.length > 0) {
    const { error } = await supabase.from("office_timetable_slots").delete().in("id", toDelete);
    if (error) throw error;
  }

  for (const slot of slots) {
    if (slot.id) {
      const { error } = await supabase
        .from("office_timetable_slots")
        .update({
          time_label: slot.time_label,
          activity: slot.activity,
          description: slot.description,
          sort_order: slot.sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq("id", slot.id)
        .eq("office_id", officeId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("office_timetable_slots").insert({
        office_id: officeId,
        time_label: slot.time_label,
        activity: slot.activity,
        description: slot.description,
        sort_order: slot.sort_order,
      });
      if (error) throw error;
    }
  }
}

export async function saveOfficeProRequirements(
  officeId: string,
  requirements: Array<{
    id?: string;
    title: string;
    description: string | null;
    icon_key: string;
    details: string[];
    sort_order: number;
  }>,
) {
  const { data: existing, error: fetchError } = await supabase
    .from("office_pro_requirements")
    .select("id")
    .eq("office_id", officeId);
  if (fetchError) throw fetchError;

  const keepIds = new Set(requirements.filter((r) => r.id).map((r) => r.id!));
  const toDelete = (existing ?? []).filter((r) => !keepIds.has(r.id)).map((r) => r.id);

  if (toDelete.length > 0) {
    const { error } = await supabase.from("office_pro_requirements").delete().in("id", toDelete);
    if (error) throw error;
  }

  for (const req of requirements) {
    if (req.id) {
      const { error } = await supabase
        .from("office_pro_requirements")
        .update({
          title: req.title,
          description: req.description,
          icon_key: req.icon_key,
          details: req.details,
          sort_order: req.sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.id)
        .eq("office_id", officeId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("office_pro_requirements").insert({
        office_id: officeId,
        title: req.title,
        description: req.description,
        icon_key: req.icon_key,
        details: req.details,
        sort_order: req.sort_order,
      });
      if (error) throw error;
    }
  }
}

export type { OfficeRuleSection, OfficeTimetableSlot, OfficeProRequirement, OfficeContentMeta };
