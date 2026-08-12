import { supabase } from "../integrations/supabase/client";
import { formatISODateInNigeria, formatLongDateInNigeria, formatMonthYearLabel } from "./nigeriaTime";

export type MonthTotals = {
  monthStart: string;
  label: string;
  pages: number;
  gigs: number;
  fiverrIncome: number;
  outsideIncome: number;
};

export type YearProgress = {
  year: number;
  pages: number;
  gigs: number;
  fiverrIncome: number;
  outsideIncome: number;
  totalIncome: number;
  months: MonthTotals[];
};

export type HighlightDay = {
  activity_date: string;
  net_income: number;
  pages_read: number;
  gigs_created: number;
  isAnniversary: boolean;
  heading: string;
  message: string;
};

type ActivityLite = {
  activity_date: string;
  pages_read: number | null;
  gigs_created: number | null;
  net_income: number | null;
  payment_type: string | null;
  income_platform: string | null;
};

const MOTIVATIONS = [
  "You already proved you can do hard things",
  "That winning day is still in you",
  "Remember the day the numbers bowed",
  "Your best work is not behind you",
  "Keep the same fire that built this day",
  "You have done huge before — do it again",
];

function isFiverrRow(row: ActivityLite): boolean {
  return row.payment_type === "fiverr" || row.income_platform === "fiverr";
}

function hashIndex(value: string, modulo: number): number {
  let n = 0;
  for (let i = 0; i < value.length; i += 1) n = (n + value.charCodeAt(i) * (i + 1)) % modulo;
  return n;
}

export function yearMonthStarts(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}-01`);
}

export async function fetchYearProgress(userId: string, year: number): Promise<{ progress: YearProgress; rows: ActivityLite[] }> {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const { data, error } = await supabase
    .from("daily_activities")
    .select("activity_date, pages_read, gigs_created, net_income, payment_type, income_platform")
    .eq("user_id", userId)
    .gte("activity_date", from)
    .lte("activity_date", to);
  if (error) throw error;

  const rows = (data || []) as ActivityLite[];
  const months = yearMonthStarts(year).map((monthStart) => {
    const prefix = monthStart.slice(0, 7);
    const inMonth = rows.filter((r) => r.activity_date.startsWith(prefix));
    let pages = 0;
    let gigs = 0;
    let fiverrIncome = 0;
    let outsideIncome = 0;
    inMonth.forEach((r) => {
      pages += r.pages_read || 0;
      gigs += r.gigs_created || 0;
      const income = Number(r.net_income || 0);
      if (isFiverrRow(r)) fiverrIncome += income;
      else outsideIncome += income;
    });
    return {
      monthStart,
      label: formatMonthYearLabel(monthStart),
      pages,
      gigs,
      fiverrIncome,
      outsideIncome,
    };
  });

  const progress: YearProgress = {
    year,
    pages: months.reduce((s, m) => s + m.pages, 0),
    gigs: months.reduce((s, m) => s + m.gigs, 0),
    fiverrIncome: months.reduce((s, m) => s + m.fiverrIncome, 0),
    outsideIncome: months.reduce((s, m) => s + m.outsideIncome, 0),
    totalIncome: 0,
    months,
  };
  progress.totalIncome = progress.fiverrIncome + progress.outsideIncome;
  return { progress, rows };
}

export function pickHighlightDay(rows: ActivityLite[], todayISO = formatISODateInNigeria()): HighlightDay | null {
  const earners = [...rows]
    .filter((r) => Number(r.net_income || 0) > 0)
    .sort((a, b) => Number(b.net_income || 0) - Number(a.net_income || 0));
  if (earners.length === 0) {
    const readers = [...rows]
      .filter((r) => (r.pages_read || 0) >= 5)
      .sort((a, b) => (b.pages_read || 0) - (a.pages_read || 0));
    if (!readers[0]) return null;
    const best = readers[0];
    return {
      activity_date: best.activity_date,
      net_income: Number(best.net_income || 0),
      pages_read: best.pages_read || 0,
      gigs_created: best.gigs_created || 0,
      isAnniversary: best.activity_date.slice(5) === todayISO.slice(5) && best.activity_date !== todayISO,
      heading: "The pages you finished still count",
      message: `On ${formatLongDateInNigeria(new Date(`${best.activity_date}T12:00:00`))} you read ${best.pages_read} pages. That discipline built this year.`,
    };
  }

  const todayMd = todayISO.slice(5);
  const anniversary = earners.find((r) => r.activity_date.slice(5) === todayMd && r.activity_date !== todayISO);
  const best = anniversary || earners[0];
  const income = Number(best.net_income || 0);
  const heading = MOTIVATIONS[hashIndex(best.activity_date, MOTIVATIONS.length)];
  const when = formatLongDateInNigeria(new Date(`${best.activity_date}T12:00:00`));
  const isAnniversary = Boolean(anniversary);
  const message = isAnniversary
    ? `On this day you made $${income.toLocaleString()} — ${best.gigs_created || 0} gigs and ${best.pages_read || 0} pages. That version of you is still available.`
    : `Your biggest day so far: ${when}, $${income.toLocaleString()} net. ${best.gigs_created || 0} gigs · ${best.pages_read || 0} pages. Protect that standard.`;

  return {
    activity_date: best.activity_date,
    net_income: income,
    pages_read: best.pages_read || 0,
    gigs_created: best.gigs_created || 0,
    isAnniversary,
    heading,
    message,
  };
}
