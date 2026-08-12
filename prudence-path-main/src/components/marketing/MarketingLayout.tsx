import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export { marketingNavLinks } from "@/components/marketing/MarketingHeader";

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20"
      data-prerender-ready="true"
    >
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
