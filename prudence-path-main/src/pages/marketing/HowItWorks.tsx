import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo, SITE_URL } from "@/components/marketing/Seo";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    step: "1",
    title: "Sign up with a sponsor link",
    body: "New members register with email verification and optional sponsor username so they join the right team from day one.",
  },
  {
    step: "2",
    title: "Trainer approval",
    body: "Trainers assign role, group, and sponsor. Members receive branded email when approved; sponsors and admin are notified too.",
  },
  {
    step: "3",
    title: "Daily discipline",
    body: "Submit morning todos and end-of-day activity reports. Income, pages read, gigs, and learning roll into weekly and monthly views.",
  },
  {
    step: "4",
    title: "Review & verify",
    body: "Trainers approve submissions, give feedback on rejections, and monitor group weekly overviews in real time.",
  },
];

export default function MarketingHowItWorks() {
  return (
    <MarketingLayout>
      <Seo
        title="How it works — Sign up to daily accountability"
        description="Learn how THE PRUDENCE works: signup, trainer approval, daily reports, weekly summaries, and sponsor team notifications."
        path="/how-it-works"
        keywords="how accountability software works, daily report workflow, trainer approval process Nigeria"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "How it works", path: "/how-it-works" },
        ]}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to use THE PRUDENCE",
          description: "From signup to daily accountability on THE PRUDENCE.",
          step: steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.title,
            text: s.body,
          })),
        }}
      />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4">How it works</h1>
        <p className="text-lg text-muted-foreground text-center mb-16">
          A simple flow from registration to measurable weekly results.
        </p>

        <ol className="space-y-10">
          {steps.map((s) => (
            <li key={s.step} className="flex gap-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground font-bold text-lg">
                {s.step}
              </span>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">{s.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="text-center mt-16 flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild>
            <Link to="/apply">
              Start your office
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/demo">See demo</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
