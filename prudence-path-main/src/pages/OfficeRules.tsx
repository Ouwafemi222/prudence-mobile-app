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
import { FileText, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOfficeRules, type OfficeRuleSection } from "@/lib/officeContent";

export default function OfficeRules() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<OfficeRuleSection[]>([]);
  const [subtitle, setSubtitle] = useState("Guidelines and expectations for all members");
  const [noticeText, setNoticeText] = useState<string | null>(null);
  const [footerText, setFooterText] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.office_id) return;
    setLoading(true);
    fetchOfficeRules(profile.office_id)
      .then(({ sections: data, meta }) => {
        setSections(data);
        if (meta?.subtitle) setSubtitle(meta.subtitle);
        setNoticeText(meta?.notice_text ?? null);
        setFooterText(meta?.footer_text ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile?.office_id]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0" />
            Office Rules
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">{subtitle}</p>
        </div>

        {noticeText && (
          <GlassCard className="border-primary/20 bg-primary/5">
            <GlassCardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground mb-1">Important</p>
                  <p className="text-sm text-muted-foreground">{noticeText}</p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sections.length === 0 ? (
          <GlassCard>
            <GlassCardContent className="py-12 text-center text-muted-foreground">
              No office rules have been configured yet.
            </GlassCardContent>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {sections.map((rule, index) => (
              <GlassCard key={rule.id}>
                <GlassCardHeader>
                  <GlassCardTitle className="flex items-center gap-2 text-lg">
                    <Badge variant="outline">{index + 1}</Badge>
                    {rule.category}
                  </GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                  <ul className="space-y-3">
                    {rule.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-3">
                        <span className="text-primary mt-1.5 shrink-0">•</span>
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </GlassCardContent>
              </GlassCard>
            ))}
          </div>
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
