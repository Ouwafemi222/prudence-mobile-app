import { Link } from "react-router-dom";
import { ArrowRight, Clock, Globe, Mail, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { marketingNavLinks } from "@/components/marketing/MarketingHeader";
import { Logo } from "@/components/brand/Logo";

const productLinks = marketingNavLinks.slice(0, 4);
const companyLinks = marketingNavLinks.slice(4);

const trustBadges = [
  { icon: ShieldCheck, label: "Free for all offices" },
  { icon: Clock, label: "WAT timezone" },
  { icon: MapPin, label: "Built for Nigeria" },
  { icon: Globe, label: "Used worldwide" },
];

export function MarketingFooter() {
  const { user } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 relative overflow-hidden">
      {/* Pre-footer CTA */}
      <div className="relative border-y border-border/50 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,hsl(var(--primary)/0.12),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-primary mb-2">Ready when you are</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-3">
                Run your office with daily discipline
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Launch a new workspace or join your team with an invite link — structured reporting,
                trainer oversight, and sponsor visibility included free.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              {user ? (
                <Button size="lg" asChild className="shadow-lg shadow-primary/20">
                  <Link to="/dashboard">
                    Open dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild className="shadow-lg shadow-primary/20">
                    <Link to="/apply">
                      Start your office
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/auth?tab=signup">Join with invite</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="bg-muted/30 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
            {/* Brand column */}
            <div className="lg:col-span-4">
              <Link to="/" className="inline-block mb-5 group">
                <Logo
                  showWordmark
                  size="md"
                  wordmarkClassName="group-hover:opacity-90 transition-opacity"
                />
                <span className="block text-xs text-muted-foreground mt-1">
                  Office Accountability &amp; Training
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-sm">
                The Prudence Office Accountability &amp; Training System — structured daily reporting,
                sponsor teams, and trainer verification for offices in Nigeria and beyond.
              </p>
              <div className="flex flex-wrap gap-2">
                {trustBadges.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Product links */}
            <div className="lg:col-span-2 lg:col-start-6">
              <p className="text-sm font-semibold text-foreground mb-4">Product</p>
              <ul className="space-y-3 text-sm">
                {productLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      to={l.href}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div className="lg:col-span-2">
              <p className="text-sm font-semibold text-foreground mb-4">Company</p>
              <ul className="space-y-3 text-sm">
                {companyLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      to={l.href}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
                {!user && (
                  <li>
                    <Link to="/apply" className="text-muted-foreground hover:text-primary transition-colors">
                      Start your office
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            {/* Contact */}
            <div className="lg:col-span-3">
              <p className="text-sm font-semibold text-foreground mb-4">Contact</p>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="mailto:agboola378@gmail.com"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </span>
                    <span>
                      <span className="block text-foreground font-medium">Email us</span>
                      <span className="block text-xs">agboola378@gmail.com</span>
                    </span>
                  </a>
                </li>
                <li>
                  <Link
                    to={user ? "/dashboard" : "/auth"}
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </span>
                    <span>
                      <span className="block text-foreground font-medium">
                        {user ? "Your dashboard" : "Member sign in"}
                      </span>
                      <span className="block text-xs">
                        {user ? "Continue where you left off" : "Access your office workspace"}
                      </span>
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/40 bg-background/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
            <p>© {year} THE PRUDENCE. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link to="/faq" className="hover:text-primary transition-colors">
                Help
              </Link>
              <Link to="/pricing" className="hover:text-primary transition-colors">
                Pricing
              </Link>
              <a
                href="/sitemap.xml"
                className="hover:text-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sitemap
              </a>
              <span className="hidden sm:inline text-border">|</span>
              <span>prudence-path.online</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
