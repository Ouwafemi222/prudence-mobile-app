import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { LogoMark } from "@/components/brand/Logo";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"),
  sponsorUsername: z
    .string()
    .optional()
    .refine((v) => !v || /^[a-z0-9_]+$/.test(v), "Sponsor username can only contain lowercase letters, numbers, and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPasswordForEmail, resendConfirmationEmail } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const defaultTab = useMemo(() => (searchParams.get("tab") === "signup" ? "signup" : "login"), [searchParams]);
  const sponsorFromUrl = useMemo(() => (searchParams.get("sponsor") || "").toLowerCase(), [searchParams]);
  const officeFromUrl = useMemo(() => (searchParams.get("office") || "").toLowerCase(), [searchParams]);
  const [officeName, setOfficeName] = useState<string | null>(null);
  const [officeValid, setOfficeValid] = useState<boolean | null>(null);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    username: "",
    sponsorUsername: sponsorFromUrl,
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signupPendingEmail, setSignupPendingEmail] = useState<string | null>(null);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const emailConfirmedBanner = searchParams.get("confirmed") === "1";

  useEffect(() => {
    if (emailConfirmedBanner) {
      toast.success("Email confirmed! Sign in to continue.");
    }
  }, [emailConfirmedBanner]);

  useEffect(() => {
    if (!officeFromUrl) {
      setOfficeName(null);
      setOfficeValid(null);
      return;
    }
    void supabase
      .from("offices")
      .select("name")
      .eq("slug", officeFromUrl)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setOfficeName(null);
          setOfficeValid(false);
        } else {
          setOfficeName(data.name);
          setOfficeValid(true);
        }
      });
  }, [officeFromUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      loginSchema.parse(loginData);
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

    const email = loginData.email.trim().toLowerCase();
    const { error } = await signIn(email, loginData.password);

    setIsLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password");
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Please confirm your email before logging in");
      } else if (error.message.toLowerCase().includes("rate limit") || error.message.includes("429")) {
        toast.error("Too many attempts. Please try again in an hour.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success("Welcome back!");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      signupSchema.parse(signupData);
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

    if (!officeFromUrl) {
      setErrors({ office: "You need an office invite link to sign up. Ask your office admin or sponsor." });
      return;
    }

    if (officeValid === false) {
      setErrors({ office: "This office link is invalid or inactive. Check the link and try again." });
      return;
    }

    setIsLoading(true);

    await supabase.functions.invoke("prepare-signup", {
      body: { email: signupData.email.trim().toLowerCase() },
    });

    const { data: officeId, error: officeError } = await supabase.rpc("get_office_id_by_slug", {
      p_slug: officeFromUrl,
    });

    if (officeError || !officeId) {
      setIsLoading(false);
      setErrors({ office: "Could not verify office. Check your invite link." });
      return;
    }

    const sponsor = signupData.sponsorUsername?.trim()?.toLowerCase();
    if (sponsor) {
      const { data: sponsorOk, error: sponsorError } = await supabase.rpc("is_sponsor_in_office", {
        p_sponsor_username: sponsor,
        p_office_id: officeId,
      });
      if (sponsorError || !sponsorOk) {
        setIsLoading(false);
        setErrors({ sponsorUsername: "Sponsor not found in this office. Check the username or leave blank." });
        return;
      }
    }

    const { data: usernameAvailable, error: usernameCheckError } = await supabase.rpc(
      "is_username_available",
      {
        p_username: signupData.username.toLowerCase(),
        p_office_id: officeId,
      },
    );

    if (usernameCheckError) {
      setIsLoading(false);
      toast.error("Could not verify username", { description: usernameCheckError.message });
      return;
    }

    if (!usernameAvailable) {
      setIsLoading(false);
      setErrors({ username: "Username already taken or reserved" });
      return;
    }

    const signupMeta = {
      full_name: signupData.fullName,
      username: signupData.username.toLowerCase(),
      sponsor_username: signupData.sponsorUsername?.trim()?.toLowerCase() || null,
      office_slug: officeFromUrl,
    };

    const { error } = await signUp(signupData.email, signupData.password, signupMeta);

    setIsLoading(false);

    if (error) {
      if (error.message.includes("User already registered")) {
        await supabase.functions.invoke("prepare-signup", {
          body: { email: signupData.email.trim().toLowerCase() },
        });
        const retry = await signUp(signupData.email, signupData.password, signupMeta);
        if (retry.error) {
          toast.error("An account with this email may already exist. Try signing in or use Resend confirmation.");
          return;
        }
        setSignupPendingEmail(signupData.email.trim().toLowerCase());
        toast.success("Check your email to confirm your account", {
          description: "You must confirm before your account is created in the system.",
        });
        return;
      } else if (error.message.toLowerCase().includes("rate limit") || error.message.includes("429")) {
        toast.error("Too many signups right now. Please try again in an hour.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    setSignupPendingEmail(signupData.email.trim().toLowerCase());
    toast.success("Check your email to confirm your account", {
      description: "Your username is reserved until you confirm. If the link expires, you can sign up again with the same details.",
    });
  };

  const handleResendConfirmation = async () => {
    const email = signupPendingEmail || signupData.email.trim();
    if (!email) return;
    setResendingConfirmation(true);
    const { error } = await resendConfirmationEmail(email);
    setResendingConfirmation(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Confirmation email sent again");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const email = forgotPasswordEmail.trim();
    if (!email) {
      setErrors({ forgotEmail: "Enter your email address" });
      return;
    }
    try {
      z.string().email("Invalid email address").parse(email);
    } catch {
      setErrors({ forgotEmail: "Invalid email address" });
      return;
    }
    setIsLoading(true);
    const { error } = await resetPasswordForEmail(email);
    setIsLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("rate limit") || error.message.includes("429")) {
        toast.error("Too many reset requests. Please try again in an hour.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    setForgotPasswordSent(true);
    toast.success("Check your email for the reset link");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center px-4 py-12 overflow-y-auto">
      <div className="w-full max-w-md space-y-8 my-auto">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-block">
            <LogoMark size="xl" className="mx-auto mb-4 shadow-lg shadow-primary/25" />
          </Link>
          <h1 className="text-3xl font-bold text-foreground">THE PRUDENCE</h1>
          <p className="text-muted-foreground mt-2">
            Prudence Office Accountability & Training System
          </p>
        </div>

        {/* Auth Card */}
        <GlassCard className="w-full">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              {forgotPasswordMode ? (
                <>
                  <GlassCardHeader className="px-0 pt-0">
                    <GlassCardTitle>
                      {forgotPasswordSent ? "Check your email" : "Reset password"}
                    </GlassCardTitle>
                    <GlassCardDescription>
                      {forgotPasswordSent
                        ? "We sent a link to reset your password. Click the link in the email to set a new password."
                        : "Enter your email and we’ll send you a link to reset your password."}
                    </GlassCardDescription>
                  </GlassCardHeader>
                  <GlassCardContent className="px-0 space-y-4">
                    {forgotPasswordSent ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setForgotPasswordMode(false);
                          setForgotPasswordSent(false);
                          setForgotPasswordEmail("");
                        }}
                      >
                        Back to Sign In
                      </Button>
                    ) : (
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="forgot-email">Email</Label>
                          <Input
                            id="forgot-email"
                            type="email"
                            placeholder="john@prudence.com"
                            value={forgotPasswordEmail}
                            onChange={(e) => setForgotPasswordEmail(e.target.value)}
                            required
                          />
                          {errors.forgotEmail && (
                            <p className="text-sm text-destructive">{errors.forgotEmail}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setForgotPasswordMode(false)}
                            disabled={isLoading}
                          >
                            Back
                          </Button>
                          <Button type="submit" className="flex-1" disabled={isLoading}>
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              "Send reset link"
                            )}
                          </Button>
                        </div>
                      </form>
                    )}
                  </GlassCardContent>
                </>
              ) : (
                <form onSubmit={handleLogin}>
                  <GlassCardHeader className="px-0 pt-0">
                    <GlassCardTitle>Welcome back</GlassCardTitle>
                    <GlassCardDescription>
                      Enter your credentials to access your account
                    </GlassCardDescription>
                  </GlassCardHeader>
                  <GlassCardContent className="px-0 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="john@prudence.com"
                        value={loginData.email}
                        onChange={(e) =>
                          setLoginData({ ...loginData, email: e.target.value })
                        }
                        required
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Password</Label>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-sm text-primary hover:underline"
                          onClick={() => setForgotPasswordMode(true)}
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={loginData.password}
                          onChange={(e) =>
                            setLoginData({ ...loginData, password: e.target.value })
                          }
                          required
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
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setForgotPasswordMode(true)}
                    >
                      Reset password
                    </Button>
                  </GlassCardContent>
                </form>
              )}
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              {!officeFromUrl ? (
                <GlassCardContent className="px-0 space-y-4">
                  <GlassCardHeader className="px-0 pt-0">
                    <GlassCardTitle>Office invite required</GlassCardTitle>
                    <GlassCardDescription>
                      Sign up is invite-only. Use the link from your office admin or sponsor — it includes{" "}
                      <code className="text-xs">?office=your-office</code>.
                    </GlassCardDescription>
                  </GlassCardHeader>
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-900 dark:text-amber-100">
                    Existing Prudence members:{" "}
                    <Link to="/auth?tab=signup&office=prudence" className="font-medium underline">
                      sign up with the Prudence office link
                    </Link>
                    .
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Want to open a new office?{" "}
                    <Link to="/apply" className="text-primary underline">
                      Apply here
                    </Link>
                    .
                  </p>
                </GlassCardContent>
              ) : officeValid === false ? (
                <GlassCardContent className="px-0 space-y-4">
                  <GlassCardHeader className="px-0 pt-0">
                    <GlassCardTitle>Invalid office link</GlassCardTitle>
                    <GlassCardDescription>
                      The office in your link could not be found or is not active. Contact your office admin for a new invite.
                    </GlassCardDescription>
                  </GlassCardHeader>
                </GlassCardContent>
              ) : (
              <form onSubmit={handleSignup}>
                <GlassCardHeader className="px-0 pt-0">
                  <GlassCardTitle>Create an account</GlassCardTitle>
                  <GlassCardDescription>
                    Join THE PRUDENCE with your office invite link
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent className="px-0 space-y-4">
                  {officeFromUrl && officeValid && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                      Joining office:{" "}
                      <span className="font-medium text-foreground">{officeName ?? officeFromUrl}</span>
                    </div>
                  )}
                  {errors.office && (
                    <p className="text-sm text-destructive">{errors.office}</p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={signupData.fullName}
                      onChange={(e) =>
                        setSignupData({ ...signupData, fullName: e.target.value })
                      }
                      required
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="john@example.com"
                      value={signupData.email}
                      onChange={(e) =>
                        setSignupData({ ...signupData, email: e.target.value })
                      }
                      required
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="johndoe"
                      value={signupData.username}
                      onChange={(e) =>
                        setSignupData({ ...signupData, username: e.target.value.toLowerCase() })
                      }
                      required
                    />
                    {errors.username && (
                      <p className="text-sm text-destructive">{errors.username}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sponsorUsername">Sponsor Username (optional)</Label>
                    <Input
                      id="sponsorUsername"
                      placeholder="e.g., smartdane"
                      value={signupData.sponsorUsername}
                      onChange={(e) =>
                        setSignupData({ ...signupData, sponsorUsername: e.target.value.toLowerCase() })
                      }
                    />
                    {errors.sponsorUsername && (
                      <p className="text-sm text-destructive">{errors.sponsorUsername}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      If you don’t know your sponsor, leave this blank. A trainer/admin can assign it later.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.password}
                        onChange={(e) =>
                          setSignupData({ ...signupData, password: e.target.value })
                        }
                        required
                      />
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.confirmPassword}
                        onChange={(e) =>
                          setSignupData({
                            ...signupData,
                            confirmPassword: e.target.value,
                          })
                        }
                        required
                      />
                      {errors.confirmPassword && (
                        <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                  {signupPendingEmail ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                      <p className="text-sm text-foreground font-medium">Confirm your email</p>
                      <p className="text-xs text-muted-foreground">
                        We sent a link to <span className="font-medium">{signupPendingEmail}</span>.
                        Your account is not active until you confirm. If the link expired, use Resend or sign up again with the same email and username.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={resendingConfirmation}
                        onClick={handleResendConfirmation}
                      >
                        {resendingConfirmation ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Resend confirmation email"
                        )}
                      </Button>
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    After you confirm your email, a trainer must approve your account before you can access the full system.
                  </p>
                  <Button type="submit" className="w-full" disabled={isLoading || !!signupPendingEmail}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </GlassCardContent>
              </form>
              )}
            </TabsContent>
          </Tabs>
        </GlassCard>

        <p className="text-center text-sm text-muted-foreground">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
