import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MarketingAuthActions } from "@/components/marketing/MarketingAuthActions";
import { Logo } from "@/components/brand/Logo";

export const marketingNavLinks = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/demo", label: "Demo" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
] as const;

export function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="glass-card border-b border-border/40 bg-background/70 backdrop-blur-xl shadow-sm shadow-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-[4.25rem] items-center justify-between gap-4">
            <Link
              to="/"
              className="group shrink-0 rounded-xl py-1 pr-2 transition-colors hover:bg-accent/40"
            >
              <Logo
                showWordmark
                showTagline
                size="md"
                wordmarkClassName="hidden sm:block"
                className="relative group-hover:scale-[1.01] transition-transform"
              />
            </Link>

            <nav
              className="hidden lg:flex items-center gap-1 rounded-full border border-border/50 bg-background/60 p-1"
              aria-label="Main"
            >
              {marketingNavLinks.map((link) => {
                const active = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      "rounded-full px-3.5 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-border/50">
              <MarketingAuthActions variant="desktop" />
            </div>

            <button
              type="button"
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/80 hover:bg-accent transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
            aria-label="Close menu overlay"
            onClick={closeMenu}
          />
          <div className="fixed inset-x-0 top-[4.25rem] z-50 lg:hidden max-h-[calc(100dvh-4.25rem)] overflow-y-auto border-b border-border/50 bg-background/95 backdrop-blur-xl shadow-xl">
            <div className="px-4 py-5 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                  Explore
                </p>
                <div className="grid gap-1">
                  {marketingNavLinks.map((link) => {
                    const active = location.pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={closeMenu}
                        className={cn(
                          "flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-accent",
                        )}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 to-accent/10 p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Get started</p>
                <MarketingAuthActions variant="mobile" onNavigate={closeMenu} />
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
