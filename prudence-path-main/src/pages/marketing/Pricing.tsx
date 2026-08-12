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
import { ArrowRight, CheckCircle2 } from "lucide-react";

const included = [
  "Unlimited members per office",
  "Daily activity & todo reporting",
  "Trainer verification workflow",
  "Sponsor team dashboards",
  "Weekly & monthly rollups (WAT timezone)",
  "Skills hub & proof uploads",
  "Real-time sync across devices",
  "Office rules, timetable & pro requirements",
];

export default function MarketingPricing() {
  return (
    <MarketingLayout>
      <Seo
        title="Pricing — Free for every office"
        description="THE PRUDENCE is free for offices in Nigeria and worldwide. Daily reporting, trainer verification, sponsor teams, and monthly goals at no cost."
        path="/pricing"
        keywords="free office accountability software, free team training app Nigeria, THE PRUDENCE pricing"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ]}
        jsonLd={{
          ...softwareApplicationJsonLd(),
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            description: "Free for all offices",
          },
        }}
      />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Simple, free pricing
          </h1>
          <p className="text-lg text-muted-foreground">
            THE PRUDENCE is free for every office. Apply to get your workspace provisioned — no credit
            card, no trial limits.
          </p>
        </div>

        <GlassCard className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/10">
          <GlassCardHeader className="text-center pb-2">
            <GlassCardDescription>Office plan</GlassCardDescription>
            <GlassCardTitle className="text-5xl font-bold mt-2">
              $0
              <span className="text-lg font-normal text-muted-foreground"> / forever</span>
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <ul className="space-y-3 mb-8">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3 text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1" asChild>
                <Link to="/apply">
                  Apply for your office
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="flex-1" asChild>
                <Link to="/auth?tab=signup">Join existing office</Link>
              </Button>
            </div>
          </GlassCardContent>
        </GlassCard>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Questions about enterprise needs?{" "}
          <a href="mailto:agboola378@gmail.com" className="text-primary hover:underline">
            Contact us
          </a>
        </p>
      </section>
    </MarketingLayout>
  );
}
