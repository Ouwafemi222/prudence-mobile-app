import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Target, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchOfficeProRequirements,
  proRequirementIcon,
  type OfficeProRequirement,
} from "@/lib/officeContent";

export default function ProRequirements() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<OfficeProRequirement[]>([]);
  const [subtitle, setSubtitle] = useState("Requirements and criteria to become a Pro member");
  const [overview, setOverview] = useState<string | null>(null);
  const [privileges, setPrivileges] = useState<string[]>([]);
  const [footerText, setFooterText] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.office_id) return;
    setLoading(true);
    fetchOfficeProRequirements(profile.office_id)
      .then(({ requirements: data, meta, privileges: privs }) => {
        setRequirements(data);
        if (meta?.subtitle) setSubtitle(meta.subtitle);
        setOverview(meta?.notice_text ?? null);
        setFooterText(meta?.footer_text ?? null);
        setPrivileges(privs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile?.office_id]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0" />
            Pro Requirements
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">{subtitle}</p>
        </div>

        {overview && (
          <GlassCard className="border-primary/20 bg-primary/5">
            <GlassCardHeader>
              <GlassCardTitle>Overview</GlassCardTitle>
              <GlassCardDescription>{overview}</GlassCardDescription>
            </GlassCardHeader>
          </GlassCard>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : requirements.length === 0 ? (
          <GlassCard>
            <GlassCardContent className="py-12 text-center text-muted-foreground">
              No pro requirements have been configured yet.
            </GlassCardContent>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {requirements.map((req, index) => {
              const Icon = proRequirementIcon(req.icon_key);
              return (
                <GlassCard key={req.id}>
                  <GlassCardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <GlassCardTitle className="flex flex-wrap items-center gap-2 text-lg">
                          <Badge variant="outline">{index + 1}</Badge>
                          {req.title}
                        </GlassCardTitle>
                        {req.description && (
                          <GlassCardDescription className="mt-1">{req.description}</GlassCardDescription>
                        )}
                      </div>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <ul className="space-y-2">
                      {req.details.map((detail, detailIndex) => (
                        <li
                          key={detailIndex}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </GlassCardContent>
                </GlassCard>
              );
            })}
          </div>
        )}

        {privileges.length > 0 && (
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle>Pro Member Privileges</GlassCardTitle>
              <GlassCardDescription>
                Once you become a Pro member, you gain access to the following privileges:
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <ul className="space-y-3">
                {privileges.map((privilege, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{privilege}</span>
                  </li>
                ))}
              </ul>
            </GlassCardContent>
          </GlassCard>
        )}

        {footerText && (
          <GlassCard>
            <GlassCardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">{footerText}</p>
            </GlassCardContent>
          </GlassCard>
        )}
      </div>
    </AppLayout>
  );
}
