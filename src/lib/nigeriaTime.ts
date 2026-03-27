export const NIGERIA_TIME_ZONE = "Africa/Lagos";

type DateParts = { year: number; month: number; day: number };

function getDatePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));

  if (!year || !month || !day) throw new Error("Failed to compute date parts for time zone: " + timeZone);
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
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

