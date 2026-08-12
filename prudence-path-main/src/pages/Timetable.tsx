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
import { Clock, Calendar, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOfficeTimetable, type OfficeTimetableSlot } from "@/lib/officeContent";

export default function Timetable() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<OfficeTimetableSlot[]>([]);
  const [subtitle, setSubtitle] = useState("Recommended daily schedule for members");
  const [notes, setNotes] = useState<string[]>([]);

  useEffect(() => {
    if (!profile?.office_id) return;
    setLoading(true);
    fetchOfficeTimetable(profile.office_id)
      .then(({ slots, meta, notes: noteItems }) => {
        setSchedule(slots);
        if (meta?.subtitle) setSubtitle(meta.subtitle);
        setNotes(noteItems);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile?.office_id]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0" />
            Daily Timetable
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">{subtitle}</p>
        </div>

        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Daily Schedule
            </GlassCardTitle>
            <GlassCardDescription>
              Recommended time allocation for daily activities
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : schedule.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No timetable configured yet.</p>
            ) : (
              <div className="space-y-4">
                {schedule.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-accent/30 border border-border/50 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                          <Badge variant="outline" className="w-fit shrink-0">
                            {item.time_label}
                          </Badge>
                          <h3 className="font-semibold text-foreground">{item.activity}</h3>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>

        {notes.length > 0 && (
          <GlassCard className="border-primary/20 bg-primary/5">
            <GlassCardHeader>
              <GlassCardTitle>Important Notes</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {notes.map((note, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-1.5 shrink-0">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </GlassCardContent>
          </GlassCard>
        )}
      </div>
    </AppLayout>
  );
}
