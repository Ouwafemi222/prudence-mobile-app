import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Clock, Mail, LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LogoMark } from "@/components/brand/Logo";

export default function WaitingApproval() {
  const { profile, office, signOut, refreshProfile } = useAuth();
  const adminNotified = useRef(false);

  useEffect(() => {
    if (!profile || profile.approval_status !== "pending") return;

    if (!adminNotified.current) {
      adminNotified.current = true;
      supabase.functions.invoke("notify-admin-signup").catch((err) => {
        console.warn("Admin signup notification failed:", err);
      });
    }
    // Sponsors are notified only after trainer approval (see Teams handleApprove).
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleRefresh = async () => {
    await refreshProfile();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo */}
        <div className="text-center">
          <LogoMark size="xl" className="mx-auto mb-4 shadow-lg shadow-primary/25" />
          <h1 className="text-3xl font-bold text-foreground">{office?.name ?? "THE PRUDENCE"}</h1>
          {office && (
            <p className="text-sm text-muted-foreground mt-1">Powered by THE PRUDENCE</p>
          )}
        </div>

        {/* Waiting Card */}
        <GlassCard className="text-center">
          <GlassCardHeader>
            <div className="mx-auto mb-4 p-4 rounded-full bg-warning/10 w-fit">
              <Clock className="h-12 w-12 text-warning" />
            </div>
            <GlassCardTitle className="text-2xl">
              Account Pending Approval
            </GlassCardTitle>
            <GlassCardDescription className="text-base">
              Your account has been created and is awaiting approval from a trainer
              or administrator.
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="space-y-6">
            {profile && (
              <div className="bg-accent/50 rounded-xl p-4 text-left">
                <p className="text-sm text-muted-foreground mb-2">Account Details</p>
                <p className="font-medium text-foreground">{profile.full_name}</p>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Sponsor: @{profile.sponsor_username}
                </p>
              </div>
            )}

            <div className="bg-accent/50 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-foreground">What happens next?</h3>
              <ul className="text-sm text-muted-foreground space-y-3 text-left">
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                    1
                  </span>
                  <span>
                    A trainer or administrator will review your registration request.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                    2
                  </span>
                  <span>
                    They will assign you a role and group based on your sponsor's
                    information.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                    3
                  </span>
                  <span>
                    You'll be able to access the full system once your account is
                    approved.
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Check your email for updates</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
              <Button variant="secondary" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Status
              </Button>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Contact Info */}
        <p className="text-center text-sm text-muted-foreground">
          Need help?{" "}
          <a href="mailto:support@prudence.com" className="text-primary hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
