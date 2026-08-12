import { Link } from "react-router-dom";
import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { FaqSection } from "@/components/marketing/FaqSection";
import { Seo, SITE_URL } from "@/components/marketing/Seo";
import {
  faqPageJsonLd,
  MARKETING_FAQ,
  softwareApplicationJsonLd,
} from "@/lib/marketingFaq";
import {
  ArrowRight,
  CheckCircle2,
  Target,
  Users,
  BarChart3,
  BookOpen,
  Shield,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Daily Accountability",
    description:
      "Structured daily reports for reading, income, gigs, prospecting, and skills — with proof and trainer verification.",
  },
  {
    icon: Users,
    title: "Sponsor Teams",
    description:
      "Invite members with your sponsor link. Direct sponsors get notified when someone joins and is approved.",
  },
  {
    icon: BarChart3,
    title: "Weekly & Monthly Insights",
    description:
      "Sunday-based weeks and monthly goal windows with live rollups of targets vs actual performance.",
  },
  {
    icon: BookOpen,
    title: "Skills Development",
    description:
      "Skills hub and learning rollups so growth is tracked alongside income and activity.",
  },
  {
    icon: Shield,
    title: "Trainer Verification",
    description:
      "Approve or reject submissions with feedback. Resubmissions return to pending for fair re-review.",
  },
  {
    icon: Zap,
    title: "Real-time Sync",
    description:
      "Dashboards and reports update live across devices — no refresh required to see the latest numbers.",
  },
];

export default function Index() {
  return (
    <MarketingLayout>
      <Seo
        title="THE PRUDENCE — Office Accountability & Training"
        description="THE PRUDENCE is the Prudence Office Accountability & Training System — structured reporting, sponsor teams, and trainer oversight in one secure web app."
        path="/"
        keywords="The Prudence, office accountability software Nigeria, daily activity report, team performance tracking, sponsor downline, WAT timezone"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "THE PRUDENCE",
            url: SITE_URL,
            description:
              "THE PRUDENCE is the Prudence Office Accountability & Training System — structured reporting, sponsor teams, and trainer oversight in one secure web app.",
            inLanguage: "en-NG",
          },
          softwareApplicationJsonLd(),
          faqPageJsonLd(),
        ]}
      />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent-foreground)/0.1),transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32 text-center">
          <div className="flex justify-center mb-8">
            <LogoMark size="2xl" className="shadow-xl shadow-primary/30" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-4">
            Daily discipline.{" "}
            <span className="bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
              Visible results.
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            THE PRUDENCE is the Prudence Office Accountability &amp; Training System — structured
            reporting, sponsor teams, and trainer oversight in one secure web app. Built for offices
            in Nigeria (WAT timezone) and teams worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg px-8">
              <Link to="/apply">
                Start your office
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8">
              <Link to="/auth?tab=signup">Join with invite link</Link>
            </Button>
          </div>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-10 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Free for all offices
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Sunday–Saturday weeks (WAT)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Real-time dashboards
            </li>
          </ul>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything your office needs
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Replace scattered messages and spreadsheets with one system members actually use every day.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <GlassCard
              key={feature.title}
              className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <GlassCardHeader>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent-foreground/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <GlassCardTitle>{feature.title}</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <GlassCardDescription className="text-base">
                  {feature.description}
                </GlassCardDescription>
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>
        <p className="text-center mt-10">
          <Link to="/features" className="text-primary font-medium hover:underline">
            View all features →
          </Link>
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Frequently asked questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Quick answers about joining, starting an office, and daily accountability.
          </p>
        </div>
        <FaqSection items={MARKETING_FAQ} limit={6} />
        <p className="text-center mt-8">
          <Link to="/faq" className="text-primary font-medium hover:underline">
            View all {MARKETING_FAQ.length} questions →
          </Link>
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <GlassCard className="p-8 sm:p-12 text-center bg-gradient-to-br from-primary/5 to-accent/10">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to hold your team to a higher standard?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Start a new office or join an existing one with your sponsor invite link.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/apply">
                Apply for your office
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/demo">See demo</Link>
            </Button>
          </div>
        </GlassCard>
      </section>
    </MarketingLayout>
  );
}
