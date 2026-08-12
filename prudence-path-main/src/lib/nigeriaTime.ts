export const NIGERIA_TIME_ZONE = "Africa/Lagos";

type DateParts = { year: number; month: number; day: number };

function getDatePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value;

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));

  if (!year || !month || !day) {
    throw new Error("Failed to compute date parts for time zone: " + timeZone);
  }

  return { year, month, day };
}

export function formatISODateInNigeria(date: Date = new Date()): string {
  const { year, month, day } = getDatePartsInTimeZone(date, NIGERIA_TIME_ZONE);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function formatLongDateInNigeria(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    timeZone: NIGERIA_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function addDaysISODate(isoDate: string, days: number): string {
  // isoDate is treated as a date-only value in Nigeria; do arithmetic in UTC.
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Week runs Sunday (start) through Saturday (end), in Nigeria calendar dates. */
export function getNigeriaWeekStartISO(date: Date = new Date()): string {
  const todayISO = formatISODateInNigeria(date);
  const d = new Date(`${todayISO}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function getNigeriaWeekEndISO(date: Date = new Date()): string {
  return addDaysISODate(getNigeriaWeekStartISO(date), 6);
}

export const NIGERIA_WEEKDAY_LABELS_SUN_FIRST = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Seven ISO dates for a week (Sunday → Saturday). Pass week-start ISO or any date in that week. */
export function getNigeriaWeekDayISOs(dateOrWeekStart: Date | string = new Date()): string[] {
  const start =
    typeof dateOrWeekStart === "string"
      ? dateOrWeekStart
      : getNigeriaWeekStartISO(dateOrWeekStart);
  return Array.from({ length: 7 }, (_, i) => addDaysISODate(start, i));
}

export function formatWeekdayLabelForISODate(isoDate: string): string {
  const dow = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return NIGERIA_WEEKDAY_LABELS_SUN_FIRST[dow];
}

/** Sunday-based week number (1-based) for the week containing weekStartISO. */
export function getSundayWeekNumber(weekStartISO: string): number {
  const start = new Date(`${weekStartISO}T00:00:00Z`);
  const year = start.getUTCFullYear();
  const jan1 = new Date(`${year}-01-01T00:00:00Z`);
  const jan1Dow = jan1.getUTCDay();
  const firstSunday = new Date(jan1);
  if (jan1Dow !== 0) {
    firstSunday.setUTCDate(jan1.getUTCDate() + (7 - jan1Dow));
  }
  const diffDays = Math.floor((start.getTime() - firstSunday.getTime()) / 86400000);
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

/** Recent Sunday week-start dates, newest first. */
export function listRecentWeekStarts(count = 16): string[] {
  const current = getNigeriaWeekStartISO();
  return Array.from({ length: count }, (_, i) => addDaysISODate(current, -7 * i));
}

/** Recent month-start dates (YYYY-MM-01), newest first. */
export function listRecentMonthStarts(count = 12): string[] {
  const current = getNigeriaMonthStartISO();
  const [y, m] = current.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, (m ?? 1) - 1 - i, 1));
    return d.toISOString().slice(0, 10);
  });
}

export function formatMonthYearLabel(monthStartISO: string): string {
  const d = new Date(`${monthStartISO}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    timeZone: NIGERIA_TIME_ZONE,
    month: "long",
    year: "numeric",
  });
}

export function getNigeriaMonthStartISO(date: Date = new Date()): string {
  const { year, month } = getDatePartsInTimeZone(date, NIGERIA_TIME_ZONE);
  const mm = String(month).padStart(2, "0");
  return `${year}-${mm}-01`;
}

export function getNigeriaMonthEndISO(date: Date = new Date()): string {
  const { year, month } = getDatePartsInTimeZone(date, NIGERIA_TIME_ZONE);
  // Day 0 of next month is last day of current month
  const lastDay = new Date(Date.UTC(year, month, 0));
  return lastDay.toISOString().slice(0, 10);
}

export function getNigeriaNowLockInfo(date: Date = new Date()): {
  isLockedForToday: boolean;
  minutesUntilLock: number | null;
  lockTimeUtc: Date;
  todayISO: string;
} {
  const todayISO = formatISODateInNigeria(date);
  const [y, m, d] = todayISO.split("-").map(Number);
  // 11:59 PM Nigeria (UTC+1) == 22:59 UTC
  const lockTimeUtc = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 22, 59, 0));
  const now = new Date();
  const diffMs = lockTimeUtc.getTime() - now.getTime();
  const minutesUntilLock = diffMs > 0 ? Math.floor(diffMs / (1000 * 60)) : 0;
  return {
    isLockedForToday: now.getTime() >= lockTimeUtc.getTime(),
    minutesUntilLock: diffMs > 0 ? minutesUntilLock : null,
    lockTimeUtc,
    todayISO,
  };
}


