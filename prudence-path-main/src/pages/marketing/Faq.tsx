import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo, SITE_URL } from "@/components/marketing/Seo";
import { FaqSection } from "@/components/marketing/FaqSection";
import { Button } from "@/components/ui/button";
import { faqPageJsonLd, MARKETING_FAQ, softwareApplicationJsonLd } from "@/lib/marketingFaq";
import { ArrowRight } from "lucide-react";

export default function MarketingFaq() {
  return (
    <MarketingLayout>
      <Seo
        title="FAQ — Office accountability questions answered"
        description="Answers about THE PRUDENCE: daily reports, trainer verification, sponsor teams, Nigeria WAT timezone, pricing, and how to join or start an office."
        path="/faq"
        keywords="THE PRUDENCE FAQ, office accountability Nigeria, daily report software questions, how to join Prudence office"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
        ]}
        jsonLd={[softwareApplicationJsonLd(), faqPageJsonLd()]}
      />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Frequently asked questions
          </h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about joining, starting an office, and daily accountability on
            THE PRUDENCE.
          </p>
        </div>

        <FaqSection items={MARKETING_FAQ} />

        <div className="mt-14 text-center space-y-4">
          <p className="text-muted-foreground">Still have questions?</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <a href="mailto:agboola378@gmail.com">Email support</a>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/apply">
                Start your office
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
