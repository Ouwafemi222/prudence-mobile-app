import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";
import { Button } from "@/components/ui/button";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { softwareApplicationJsonLd } from "@/lib/marketingFaq";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Shield,
  Target,
  Users,
} from "lucide-react";

const highlights = [
  {
    icon: Target,
    title: "Daily activity reports",
    description: "Members log reading, income, gigs, prospecting, and skills with proof images.",
  },
  {
    icon: Shield,
    title: "Trainer verification",
    description: "Approve or reject submissions with feedback. Resubmissions return to pending.",
  },
  {
    icon: Users,
    title: "Sponsor dashboards",
    description: "Direct sponsors see downline progress and submission status in real time.",
  },
  {
    icon: BarChart3,
    title: "Weekly & monthly rollups",
    description: "Sunday–Saturday weeks and monthly goals auto-aggregate targets vs actuals.",
  },
];

const workflow = [
  "Member submits daily report before deadline (WAT)",
  "Trainer reviews and approves or rejects with notes",
  "Weekly summary rolls up approved days automatically",
  "Sponsor and admin dashboards update live",
];

export default function MarketingDemo() {
  return (
    <MarketingLayout>
      <Seo
        title="Demo — See THE PRUDENCE in action"
        description="Explore how THE PRUDENCE works: daily accountability reports, trainer verification, sponsor teams, and weekly performance tracking for Nigerian offices."
        path="/demo"
        keywords="office accountability demo, daily report software demo Nigeria, team training platform walkthrough"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Demo", path: "/demo" },
        ]}
        jsonLd={softwareApplicationJsonLd({
          description: "Product demo and workflow overview for THE PRUDENCE office accountability platform.",
          url: "https://prudence-path.online/demo",
        })}
      />

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            See THE PRUDENCE in action
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A walkthrough of the daily accountability workflow used by Prudence and offices applying
            to join the platform — built for teams in Nigeria (WAT timezone).
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-14">
          {highlights.map((item) => (
            <GlassCard key={item.title}>
              <GlassCardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <GlassCardTitle className="text-lg">{item.title}</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <GlassCardDescription className="text-base">{item.description}</GlassCardDescription>
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>

        <GlassCard className="mb-14">
          <GlassCardHeader>
            <GlassCardTitle>Typical daily workflow</GlassCardTitle>
            <GlassCardDescription>How members, trainers, and sponsors interact each day</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <ol className="space-y-4">
              {workflow.map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground pt-1">{step}</span>
                </li>
              ))}
            </ol>
          </GlassCardContent>
        </GlassCard>

        <GlassCard className="p-8 text-center bg-gradient-to-br from-primary/5 to-accent/10">
          <h2 className="text-2xl font-bold mb-3">Ready to try it?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Join an existing office with an invite link, or apply to start your own workspace on THE
            PRUDENCE.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link to="/apply">
                Start your office
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/how-it-works">How it works</Link>
            </Button>
          </div>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Free for all offices
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> WAT timezone
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Real-time dashboards
            </li>
          </ul>
        </GlassCard>
      </section>
    </MarketingLayout>
  );
}
