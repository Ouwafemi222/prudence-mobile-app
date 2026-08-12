import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";

function getAvatarUrl(avatarPath: string | null | undefined) {
  if (!avatarPath) return "";
  return supabase.storage.from("avatars").getPublicUrl(avatarPath).data.publicUrl;
}

function getInitials(fullName: string | undefined) {
  if (!fullName) return "?";
  return fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type MarketingAuthActionsProps = {
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
};

export function MarketingAuthActions({ variant, onNavigate }: MarketingAuthActionsProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return variant === "desktop" ? <div className="h-10 w-28" aria-hidden /> : null;
  }

  if (user) {
    if (variant === "desktop") {
      return (
        <Link
          to="/dashboard"
          className="group flex items-center gap-2.5 rounded-full border border-border/60 bg-background/80 pl-1 pr-4 py-1 hover:border-primary/30 hover:bg-accent/50 transition-all shadow-sm"
          title="Go to dashboard"
        >
          <Avatar className="h-8 w-8 ring-2 ring-primary/20">
            <AvatarImage src={getAvatarUrl(profile?.avatar_url)} alt={profile?.full_name || "User"} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground text-xs">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            Dashboard
          </span>
        </Link>
      );
    }

    return (
      <Button className="w-full" asChild>
        <Link to="/dashboard" onClick={onNavigate}>
          Go to dashboard
        </Link>
      </Button>
    );
  }

  if (variant === "desktop") {
    return (
      <>
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/auth?tab=signup">Join office</Link>
        </Button>
        <Button size="sm" className="shadow-md shadow-primary/20" asChild>
          <Link to="/apply">
            Start office
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <Button variant="outline" className="w-full" asChild>
        <Link to="/auth" onClick={onNavigate}>
          Sign in
        </Link>
      </Button>
      <Button variant="outline" className="w-full" asChild>
        <Link to="/auth?tab=signup" onClick={onNavigate}>
          Join office
        </Link>
      </Button>
      <Button className="w-full" asChild>
        <Link to="/apply" onClick={onNavigate}>
          Start office
        </Link>
      </Button>
    </>
  );
}
