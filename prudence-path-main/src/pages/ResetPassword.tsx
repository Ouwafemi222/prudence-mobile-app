import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/brand/Logo";
import { z } from "zod";

const passwordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

function parseRecoveryFromUrl(): boolean {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  return hashParams.get("type") === "recovery" || queryParams.get("type") === "recovery";
}

function parseAuthErrorFromUrl(): string | null {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  const error =
    hashParams.get("error_description") ||
    hashParams.get("error") ||
    queryParams.get("error_description") ||
    queryParams.get("error");
  return error ? decodeURIComponent(error.replace(/\+/g, " ")) : null;
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [isRecovery, setIsRecovery] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const finish = (allowed: boolean) => {
      if (!cancelled) setIsRecovery(allowed);
    };

    const urlError = parseAuthErrorFromUrl();
    if (urlError) {
      toast.error(urlError);
      finish(false);
      return;
    }

    if (parseRecoveryFromUrl()) {
      finish(true);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        finish(true);
      }
    });

    const resolveRecoverySession = async () => {
      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast.error(error.message);
          finish(false);
          return;
        }
        finish(true);
        return;
      }

      // Implicit flow: wait for detectSessionInUrl to parse hash tokens.
      await new Promise((resolve) => window.setTimeout(resolve, 250));

      if (parseRecoveryFromUrl()) {
        finish(true);
        return;
      }

      finish(false);
    };

    void resolveRecoverySession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isRecovery === false) {
      navigate("/auth", { replace: true });
    }
  }, [isRecovery, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    try {
      passwordSchema.parse({ password, confirmPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.auth.signOut();
    toast.success("Password updated. You can sign in with your new password.");
    navigate("/auth", { replace: true });
  };

  if (isRecovery === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!isRecovery) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-block">
            <LogoMark size="xl" className="mx-auto mb-4 shadow-lg shadow-primary/25" />
          </Link>
          <h1 className="text-3xl font-bold text-foreground">THE PRUDENCE</h1>
          <p className="text-muted-foreground mt-2">
            Prudence Office Accountability & Training System
          </p>
        </div>

        <GlassCard className="w-full">
          <GlassCardHeader className="px-0 pt-0">
            <GlassCardTitle>Set new password</GlassCardTitle>
            <GlassCardDescription>
              Enter your new password below. You’ll use it to sign in from now on.
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="px-0 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary hover:underline">
                Back to Sign In
              </Link>
            </p>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  );
}
