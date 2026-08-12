/** Shared FAQ content for homepage, /faq, and JSON-LD. */
export type FaqItem = {
  question: string;
  answer: string;
};

export const MARKETING_FAQ: FaqItem[] = [
  {
    question: "What is THE PRUDENCE?",
    answer:
      "THE PRUDENCE is the Prudence Office Accountability & Training System — a secure web app for structured daily reporting, sponsor teams, trainer verification, and weekly and monthly performance rollups.",
  },
  {
    question: "Who is THE PRUDENCE for?",
    answer:
      "Office owners, trainers, sponsors, and members who need daily discipline, transparent team performance, and structured training workflows — especially teams operating in Nigeria (WAT / Africa/Lagos timezone).",
  },
  {
    question: "Is THE PRUDENCE free?",
    answer:
      "Yes. Offices can apply to use THE PRUDENCE at no cost. There are no subscription fees for daily reporting, trainer verification, or sponsor team features.",
  },
  {
    question: "How do I join an existing office?",
    answer:
      "Ask your office admin or sponsor for an invite link. New members sign up with email verification, enter their sponsor username if required, and wait for trainer or admin approval before accessing the app.",
  },
  {
    question: "How do I start my own office on THE PRUDENCE?",
    answer:
      "Apply at prudence-path.online/apply with your organization name, contact details, team size, and use case. Our team reviews applications and provisions a dedicated office workspace for approved organizations.",
  },
  {
    question: "What does a daily activity report include?",
    answer:
      "Members log reading pages, gigs completed, income, prospecting activity, skills practiced, and optional proof images. Trainers review submissions and approve or reject with feedback.",
  },
  {
    question: "How do weekly and monthly reports work?",
    answer:
      "Weeks run Sunday through Saturday (WAT). Daily submissions roll into weekly summaries automatically. Monthly goals track targets vs actuals across reading, income, and activity metrics.",
  },
  {
    question: "What is trainer verification?",
    answer:
      "Trainers approve or reject daily and weekly submissions. Rejected reports include feedback so members can fix and resubmit. Trainers cannot approve their own submissions.",
  },
  {
    question: "Can sponsors see their team’s progress?",
    answer:
      "Yes. Sponsors get a dashboard showing direct downline members, submission status, and team performance so they can coach and follow up in real time.",
  },
  {
    question: "Is my data secure?",
    answer:
      "THE PRUDENCE uses Supabase with row-level security, authenticated access, and role-based permissions. App routes are not indexed by search engines; only public marketing pages are crawlable.",
  },
  {
    question: "What timezone does THE PRUDENCE use?",
    answer:
      "THE PRUDENCE is built for West Africa Time (WAT, GMT+1, Africa/Lagos). Daily deadlines, weekly boundaries, and monthly windows follow this timezone.",
  },
  {
    question: "How do I get support?",
    answer:
      "Email agboola378@gmail.com for onboarding help, office applications, or technical questions. Approved offices receive trainer and admin setup guidance during provisioning.",
  },
];

export function faqPageJsonLd(faq: FaqItem[] = MARKETING_FAQ) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function softwareApplicationJsonLd(overrides?: {
  description?: string;
  url?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "THE PRUDENCE",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: overrides?.url ?? "https://prudence-path.online",
    description:
      overrides?.description ??
      "THE PRUDENCE is the Prudence Office Accountability & Training System — structured reporting, sponsor teams, and trainer oversight in one secure web app.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    areaServed: {
      "@type": "Country",
      name: "Nigeria",
    },
  };
}
