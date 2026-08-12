import { fetchOfficeRules, fetchOfficeTimetable, fetchOfficeProRequirements } from "./officeContent";
import { supabase } from "../integrations/supabase/client";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const CORE_KNOWLEDGE: { keys: string[]; answer: string }[] = [
  {
    keys: ["morning", "todo", "plan", "9am", "before 9"],
    answer:
      "Your morning plan is same-day only. Open Work → Morning Plan, write what you will do today, and save before 11:59 PM WAT. Past dates are view-only. Trainers can read your plan in Group Todos.",
  },
  {
    keys: ["night", "daily report", "daily activity", "11:59", "submit report"],
    answer:
      "The night report is your Daily Activity. Open Work → Daily Activity and submit before 11:59 PM WAT. Include pages, gigs, accounts, income, contacts, proofs, and tags. After lock time it becomes read-only.",
  },
  {
    keys: ["tag", "tags", "unique", "already used"],
    answer:
      "Tags are lifetime unique in your office. You can edit today’s tags freely when you update today’s report. A tag used on another day cannot be reused. Max 10 tags, one per box, case-insensitive.",
  },
  {
    keys: ["proof", "image", "camera", "book", "photo"],
    answer:
      "For book proof you can pick from your gallery or tap Snap live to take a photo now. Proof images show on your report and in the trainer review screen.",
  },
  {
    keys: ["monthly", "goal", "goals", "window"],
    answer:
      "Monthly goals can be set from 3 days before the month starts through day 3 of the month. Open Reports → Monthly. You can attach book photos and see a January-to-now calculator for pages, Fiverr, outside Fiverr, and gigs.",
  },
  {
    keys: ["weekly", "week", "consistency"],
    answer:
      "Weekly reports run Sunday to Saturday (WAT). Open Reports → Weekly to see pages, gigs, income, contacts, and your 7-day consistency.",
  },
  {
    keys: ["approve", "approved", "reject", "rejected", "pending", "account"],
    answer:
      "New accounts stay pending until an admin or trainer approves them. You will get an in-app notification from THE PRUDENCE when you are approved or rejected. Rejected members should contact their office admin.",
  },
  {
    keys: ["notification", "alert", "inbox", "push"],
    answer:
      "Open Profile → Alerts → Open alerts inbox, or Home → Notifications. Approvals, rejections, and trainer feedback appear there and as THE PRUDENCE notifications on your phone.",
  },
  {
    keys: ["skill", "skills", "pdf", "training"],
    answer:
      "Open Profile → My Skills to see skills assigned to you, or Learn → Skills Hub to browse office skills, overview, theory, practical, and training PDFs.",
  },
  {
    keys: ["group", "trainer", "verify", "night report"],
    answer:
      "Trainers open Group Todos to see each member’s Morning Plan and Night Report on one card. Tap Night Report to review images and approve or reject.",
  },
  {
    keys: ["fiverr", "income", "fee", "gig"],
    answer:
      "If payment type is Fiverr, the app calculates a 20% Fiverr fee and net income for you. Outside Fiverr, enter the amount you actually received.",
  },
  {
    keys: ["password", "profile", "avatar", "username"],
    answer:
      "Open Profile to update your name, photo, password, and alert preferences. Username is read-only after signup.",
  },
  {
    keys: ["hello", "hi", "hey", "help"],
    answer:
      "Hi — I’m the Prudence assistant. Ask me about morning plans, daily reports, tags, monthly goals, skills, approvals, or office rules.",
  },
];

function score(question: string, keys: string[]): number {
  const q = question.toLowerCase();
  return keys.reduce((sum, key) => sum + (q.includes(key) ? (key.length > 6 ? 2 : 1) : 0), 0);
}

export async function answerMemberQuestion(
  question: string,
  options?: { officeId?: string | null; name?: string | null },
): Promise<string> {
  const trimmed = question.trim();
  if (!trimmed) return "Type a question about THE PRUDENCE and I’ll answer right away.";

  let extra = "";
  if (options?.officeId) {
    try {
      const [rules, timetable, pro, skills] = await Promise.all([
        fetchOfficeRules(options.officeId),
        fetchOfficeTimetable(options.officeId),
        fetchOfficeProRequirements(options.officeId),
        supabase.from("skills").select("name, overview").eq("office_id", options.officeId).eq("is_active", true).limit(12),
      ]);
      const q = trimmed.toLowerCase();
      if (q.includes("rule") && rules.sections[0]) {
        const first = rules.sections[0];
        extra = `\n\nFrom your office rules (${first.category}): ${first.items.slice(0, 4).join("; ")}`;
      } else if ((q.includes("timetable") || q.includes("schedule")) && timetable.slots[0]) {
        extra = `\n\nToday’s office timetable starts with ${timetable.slots[0].time_label} — ${timetable.slots[0].activity}.`;
      } else if (q.includes("pro") && pro.requirements[0]) {
        extra = `\n\nA Pro requirement in your office: ${pro.requirements[0].title}. ${pro.requirements[0].description || ""}`;
      } else if (q.includes("skill") && (skills.data || []).length) {
        extra = `\n\nSkills in your office include: ${(skills.data || []).map((s) => s.name).join(", ")}.`;
      }
    } catch {
      /* keep core answer */
    }
  }

  let best = CORE_KNOWLEDGE[CORE_KNOWLEDGE.length - 1];
  let bestScore = 0;
  for (const item of CORE_KNOWLEDGE) {
    const s = score(trimmed, item.keys);
    if (s > bestScore) {
      best = item;
      bestScore = s;
    }
  }

  if (bestScore === 0) {
    return `${options?.name ? `${options.name}, ` : ""}I can help with morning plans, daily reports, tags, monthly goals, skills, approvals, and office rules. Try asking “When is the night report due?” or “How do tags work?”${extra}`;
  }

  return `${best.answer}${extra}`;
}
