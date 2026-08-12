import { formatISODateInNigeria, getNigeriaNowLockInfo } from "./nigeriaTime";

export function isTodoDateToday(isoDate: string): boolean {
  return isoDate === formatISODateInNigeria();
}

/** Same-day only: editable only when todo_date is today (WAT) and before 11:59 PM lock. */
export function isTodoDateEditable(isoDate: string): boolean {
  const today = formatISODateInNigeria();
  if (isoDate !== today) return false;
  return !getNigeriaNowLockInfo().isLockedForToday;
}

export function getTodoLockMessage(isoDate: string): string | null {
  const today = formatISODateInNigeria();
  if (isoDate > today) {
    return "Future dates are read-only. Set your morning plan on that day before 11:59 PM (WAT).";
  }
  if (isoDate < today) {
    return "Past dates are read-only. You can view your plan and update history, but cannot edit.";
  }
  const info = getNigeriaNowLockInfo();
  if (info.isLockedForToday) {
    return "Today's todo locked at 11:59 PM (WAT). View only — same as daily reports.";
  }
  if (info.minutesUntilLock !== null) {
    const h = Math.floor(info.minutesUntilLock / 60);
    const m = info.minutesUntilLock % 60;
    return `Set today's plan before 11:59 PM (WAT). ${h}h ${m}m remaining.`;
  }
  return "Set today's plan before 11:59 PM (WAT). Same-day only.";
}
