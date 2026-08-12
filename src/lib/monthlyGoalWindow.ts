import { formatISODateInNigeria } from "./nigeriaTime";

/** Goals editable from 3 days before month start through day 3 of that month (Nigeria dates). */
export function isMonthlyGoalWindowOpen(monthYearISO: string, now: Date = new Date()): boolean {
  const today = formatISODateInNigeria(now);
  const [y, m] = monthYearISO.split("-").map(Number);
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
  const openFrom = addDays(monthStart, -3);
  const closeAfter = addDays(monthStart, 2);
  return today >= openFrom && today <= closeAfter;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getGoalBookImagePaths(goal: {
  goal_book_image?: string | null;
  goal_book_images?: string[] | null;
}): string[] {
  const list = [...(goal.goal_book_images || [])].filter(Boolean);
  const legacy = goal.goal_book_image?.trim();
  if (legacy && !list.includes(legacy)) list.push(legacy);
  return list;
}

export function monthlyGoalIsComplete(goal: {
  goal_book_image?: string | null;
  goal_book_images?: string[] | null;
  target_pages: number | null;
  target_tags: number | null;
  target_contacts: number | null;
  target_conversions: number | null;
  target_income: number | null;
  things_to_learn: string | null;
}): boolean {
  return Boolean(
    getGoalBookImagePaths(goal).length > 0 &&
      goal.things_to_learn?.trim() &&
      (goal.target_pages ?? 0) > 0 &&
      (goal.target_tags ?? 0) > 0 &&
      (goal.target_contacts ?? 0) > 0 &&
      (goal.target_conversions ?? 0) > 0 &&
      Number(goal.target_income ?? 0) > 0,
  );
}
