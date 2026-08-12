import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo, SITE_URL } from "@/components/marketing/Seo";
import { softwareApplicationJsonLd } from "@/lib/marketingFaq";
import { Button } from "@/components/ui/button";
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { ArrowRight } from "lucide-react";

export default function MarketingAbout() {
  return (
    <MarketingLayout>
      <Seo
        title="About — The Prudence"
        description="THE PRUDENCE is the Prudence Office Accountability & Training System — structured reporting, sponsor teams, and trainer oversight in one secure web app."
        path="/about"
        keywords="The Prudence, office accountability system, Prudence Office Accountability, team training platform Nigeria"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "THE PRUDENCE",
            url: SITE_URL,
            description:
              "THE PRUDENCE is the Prudence Office Accountability & Training System — structured reporting, sponsor teams, and trainer oversight in one secure web app.",
            email: "agboola378@gmail.com",
            areaServed: { "@type": "Country", name: "Nigeria" },
          },
          softwareApplicationJsonLd(),
        ]}
      />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-6">About THE PRUDENCE</h1>
        <p className="text-lg text-muted-foreground text-center leading-relaxed mb-12">
          THE PRUDENCE is the Prudence Office Accountability &amp; Training System — structured
          reporting, sponsor teams, and trainer oversight in one secure web app. Every member reports
          daily, every sponsor sees their team, and every trainer can verify work without spreadsheets
          or scattered chats.
        </p>

        <GlassCard className="mb-8">
          <GlassCardHeader>
            <GlassCardTitle>Our mission</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="text-muted-foreground leading-relaxed space-y-4">
            <p>
              We built this platform so discipline becomes visible — pages read, income logged, skills
              practiced, and prospects tracked in one place that updates in real time.
            </p>
            <p>
              Whether you are a member building habits, a sponsor growing a team, or a trainer holding
              the standard, THE PRUDENCE keeps everyone aligned on the same weekly and monthly rhythm.
            </p>
          </GlassCardContent>
        </GlassCard>

        <div className="text-center flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild>
            <Link to="/apply">Start your office</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/features">See features</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/auth?tab=signup">
              Join office
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
