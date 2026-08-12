import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo, SITE_URL } from "@/components/marketing/Seo";
import { softwareApplicationJsonLd } from "@/lib/marketingFaq";
import { Button } from "@/components/ui/button";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import {
  Target,
  Calendar,
  Users,
  BookOpen,
  Shield,
  BarChart3,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Daily activity reports",
    description:
      "Structured daily submissions: reading, gigs, income, prospecting, skills, and proof images — all in one workflow.",
  },
  {
    icon: Calendar,
    title: "Weekly & monthly rollups",
    description:
      "Sunday-based weeks and calendar months auto-aggregate targets vs actuals so members and trainers see progress at a glance.",
  },
  {
    icon: Users,
    title: "Sponsor & team hierarchy",
    description:
      "Direct sponsors, groups, and trainer oversight with invite links and downline visibility.",
  },
  {
    icon: Shield,
    title: "Verification workflow",
    description:
      "Trainers approve or reject submissions with feedback; resubmissions return to pending for re-review.",
  },
  {
    icon: BookOpen,
    title: "Skills hub",
    description:
      "Mandatory and optional skills assigned on approval so learning stays tied to accountability.",
  },
  {
    icon: BarChart3,
    title: "Consistency scoring",
    description:
      "Track submission streaks and weekly consistency to reinforce daily discipline.",
  },
];

export default function MarketingFeatures() {
  return (
    <MarketingLayout>
      <Seo
        title="Features — Daily accountability & team reporting"
        description="Explore THE PRUDENCE features: daily reports, weekly and monthly rollups, sponsor teams, trainer verification, and skills tracking for offices in Nigeria and beyond."
        path="/features"
        keywords="daily accountability app, team reporting software, weekly performance tracking, sponsor downline management"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Features", path: "/features" },
        ]}
        jsonLd={[softwareApplicationJsonLd(), {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "THE PRUDENCE Features",
          url: `${SITE_URL}/features`,
          description: "Daily accountability and team performance features.",
          isPartOf: { "@type": "WebSite", name: "THE PRUDENCE", url: SITE_URL },
        }]}
      />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Built for disciplined teams
          </h1>
          <p className="text-lg text-muted-foreground">
            Everything your office needs to enforce daily habits, verify work, and grow sponsors and members together.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <GlassCard key={f.title} className="h-full">
              <GlassCardHeader>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <GlassCardTitle>{f.title}</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <GlassCardDescription className="text-base">{f.description}</GlassCardDescription>
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>

        <div className="text-center mt-16 flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild>
            <Link to="/apply">
              Start your office
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/auth?tab=signup">Join with invite</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
