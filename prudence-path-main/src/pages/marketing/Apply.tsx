import { useState } from "react";
import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Seo } from "@/components/marketing/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { supabase } from "@/integrations/supabase/client";
import { softwareApplicationJsonLd } from "@/lib/marketingFaq";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

const TEAM_SIZES = ["1–10", "11–25", "26–50", "51–100", "100+"];

export default function MarketingApply() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    organizationName: "",
    contactName: "",
    contactEmail: "",
    country: "Nigeria",
    teamSize: "",
    useCase: "",
  });

  const update = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teamSize) {
      toast.error("Please select your team size.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("office_applications").insert({
      organization_name: form.organizationName.trim(),
      contact_name: form.contactName.trim(),
      contact_email: form.contactEmail.trim(),
      country: form.country.trim(),
      team_size: form.teamSize,
      use_case: form.useCase.trim(),
    });

    setSubmitting(false);

    if (error) {
      console.error(error);
      toast.error("Could not submit application. Please email agboola378@gmail.com directly.");
      return;
    }

    setSubmitted(true);
    toast.success("Application received! We'll be in touch soon.");
  };

  return (
    <MarketingLayout>
      <Seo
        title="Apply — Start your office on THE PRUDENCE"
        description="Apply to launch your office on THE PRUDENCE. Free structured daily reporting, trainer verification, and sponsor team management for organizations in Nigeria and beyond."
        path="/apply"
        keywords="start office accountability platform, apply THE PRUDENCE, team training software Nigeria, free office management app"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Apply", path: "/apply" },
        ]}
        jsonLd={softwareApplicationJsonLd({
          description:
            "Apply to start your office on THE PRUDENCE — free office accountability and training software.",
          url: "https://prudence-path.online/apply",
        })}
      />

      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Start your office
          </h1>
          <p className="text-lg text-muted-foreground">
            Apply to provision a dedicated THE PRUDENCE workspace for your organization. Free to use —
            no subscription required.
          </p>
        </div>

        {submitted ? (
          <GlassCard className="text-center p-10">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <GlassCardTitle className="mb-2">Application received</GlassCardTitle>
            <GlassCardDescription className="text-base mb-6">
              Thank you, {form.contactName}. We review applications within a few business days and
              will email {form.contactEmail} with next steps.
            </GlassCardDescription>
            <Button variant="outline" asChild>
              <Link to="/">Back to home</Link>
            </Button>
          </GlassCard>
        ) : (
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle>Office application</GlassCardTitle>
              <GlassCardDescription>
                Tell us about your organization. Already a member?{" "}
                <Link to="/auth?tab=signup" className="text-primary hover:underline">
                  Join with an invite link
                </Link>
                .
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization / office name</Label>
                  <Input
                    id="organizationName"
                    required
                    value={form.organizationName}
                    onChange={(e) => update("organizationName", e.target.value)}
                    placeholder="Your office or team name"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Your name</Label>
                    <Input
                      id="contactName"
                      required
                      value={form.contactName}
                      onChange={(e) => update("contactName", e.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      required
                      value={form.contactEmail}
                      onChange={(e) => update("contactEmail", e.target.value)}
                      placeholder="you@organization.com"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      required
                      value={form.country}
                      onChange={(e) => update("country", e.target.value)}
                      placeholder="Nigeria"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Team size</Label>
                    <Select value={form.teamSize} onValueChange={(v) => update("teamSize", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEAM_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size} members
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="useCase">How will your office use THE PRUDENCE?</Label>
                  <Textarea
                    id="useCase"
                    required
                    rows={4}
                    value={form.useCase}
                    onChange={(e) => update("useCase", e.target.value)}
                    placeholder="Daily accountability, sponsor teams, trainer oversight, skills tracking..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Submit application
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </GlassCardContent>
          </GlassCard>
        )}
      </section>
    </MarketingLayout>
  );
}
