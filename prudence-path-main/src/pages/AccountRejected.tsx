import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AccountRejected() {
  const { signOut } = useAuth();

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto py-12">
        <GlassCard className="border-destructive/40">
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              Account not approved
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your registration was reviewed and could not be approved. If you believe this is a mistake,
              contact your trainer or office admin.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" asChild className="flex-1">
                <Link to="/suggestions">Send feedback</Link>
              </Button>
              <Button
                className="flex-1"
                onClick={async () => {
                  await signOut();
                  window.location.href = "/auth";
                }}
              >
                Sign out
              </Button>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
