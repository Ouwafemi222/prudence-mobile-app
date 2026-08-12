import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Video,
  FileText,
  ArrowRight,
  Lightbulb,
  Target,
  Wrench,
  Loader2,
  Users,
  Eye,
  XCircle,
  Edit,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Skill {
  id: string;
  name: string;
  overview: string | null;
  theory: string | null;
  practical: string | null;
  tools: string | null;
  outcomes: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  training_plan_pdf_path: string | null;
  is_mandatory: boolean | null;
  trainers: string[] | null;
}

const categoryColors: Record<string, string> = {
  Foundation: "bg-chart-1/10 text-chart-1",
  "Soft Skills": "bg-chart-2/10 text-chart-2",
  Marketing: "bg-chart-3/10 text-chart-3",
  Productivity: "bg-chart-4/10 text-chart-4",
  Technical: "bg-primary/10 text-primary",
  Business: "bg-chart-4/10 text-chart-4",
};

// Helper function to parse text field into array
const parseTextArray = (text: string | null): string[] => {
  if (!text) return [];
  
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Not JSON, continue
  }
  
  // Try newline-separated
  if (text.includes('\n')) {
    return text.split('\n').filter(line => line.trim().length > 0);
  }
  
  // Try comma-separated
  if (text.includes(',')) {
    return text.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }
  
  // Single item or empty
  return text.trim() ? [text.trim()] : [];
};

export default function SkillsHub() {
  const { isAdmin, isTrainer } = useAuth();
  const navigate = useNavigate();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPdf, setSelectedPdf] = useState<{ skillName: string; pdfPath: string } | null>(null);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      // All users see all active skills (or all skills if none are marked active)
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .order("is_mandatory", { ascending: false, nullsFirst: false })
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Skills fetch error:", error);
        throw error;
      }

      console.log("Fetched skills:", data?.length || 0, "skills");

      // Filter to active skills if any exist, otherwise show all
      const activeSkills = (data || []).filter(s => s.is_active !== false);
      setSkills(activeSkills.length > 0 ? activeSkills : (data || []));

      console.log("Filtered skills:", skills.length, "active skills");
    } catch (error: any) {
      console.error("Error fetching skills:", error);
      toast.error(`Failed to load skills: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const getPdfUrl = (pdfPath: string | null): string | null => {
    if (!pdfPath) return null;
    return supabase.storage.from("training-plans").getPublicUrl(pdfPath).data.publicUrl;
  };

  const mandatorySkills = skills.filter((s) => s.is_mandatory === true);
  const optionalSkills = skills.filter((s) => s.is_mandatory !== true);


  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }
  const renderSkillCard = (skill: Skill) => {
              const theoryItems = parseTextArray(skill.theory);
              const practicalItems = parseTextArray(skill.practical);
              const toolsItems = parseTextArray(skill.tools);
              const outcomesItems = parseTextArray(skill.outcomes);
              const totalModules = theoryItems.length + practicalItems.length;
    const pdfUrl = getPdfUrl(skill.training_plan_pdf_path);

              return (
                <GlassCard key={skill.id} className="overflow-hidden">
                  <GlassCardHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
                          <GlassCardTitle>{skill.name}</GlassCardTitle>
              {pdfUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPdf({ skillName: skill.name, pdfPath: skill.training_plan_pdf_path! })}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View PDF
                </Button>
                          )}
                        </div>
                        {skill.overview && (
                          <GlassCardDescription>{skill.overview}</GlassCardDescription>
                        )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {totalModules} modules
                      </span>
              {skill.trainers && skill.trainers.length > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {skill.trainers.join(", ")}
                </span>
              )}
            </div>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4">
                        <TabsTrigger value="overview" className="text-xs">
                          Overview
                        </TabsTrigger>
                        <TabsTrigger value="theory" className="text-xs">
                          Theory
                        </TabsTrigger>
                        <TabsTrigger value="practical" className="text-xs">
                          Practical
                        </TabsTrigger>
                        <TabsTrigger value="tools" className="text-xs">
                          Tools
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="overview" className="mt-4 space-y-4">
                        {skill.overview && (
                          <p className="text-sm text-muted-foreground">{skill.overview}</p>
                        )}
                        {outcomesItems.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                              <Target className="h-4 w-4 text-primary" />
                              Learning Outcomes
                            </h4>
                            <ul className="space-y-2">
                              {outcomesItems.map((outcome, i) => (
                                <li
                                  key={i}
                                  className="text-sm text-muted-foreground flex items-center gap-2"
                                >
                                  <ArrowRight className="h-3 w-3 text-primary" />
                                  {outcome}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {!skill.overview && outcomesItems.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No overview available for this skill.
                          </p>
                        )}
                      </TabsContent>
                      <TabsContent value="theory" className="mt-4">
                        {theoryItems.length > 0 ? (
                          <ul className="space-y-2">
                            {theoryItems.map((item, i) => (
                              <li
                                key={i}
                                className="text-sm text-muted-foreground flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                              >
                                <Lightbulb className="h-4 w-4 text-chart-2 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No theory content available.
                          </p>
                        )}
                      </TabsContent>
                      <TabsContent value="practical" className="mt-4">
                        {practicalItems.length > 0 ? (
                          <ul className="space-y-2">
                            {practicalItems.map((item, i) => (
                              <li
                                key={i}
                                className="text-sm text-muted-foreground flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                              >
                                <Video className="h-4 w-4 text-chart-3 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No practical content available.
                          </p>
                        )}
                      </TabsContent>
                      <TabsContent value="tools" className="mt-4">
                        {toolsItems.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {toolsItems.map((tool) => (
                              <Badge
                                key={tool}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                <Wrench className="h-3 w-3" />
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No tools listed.
                          </p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </GlassCardContent>
                </GlassCard>
              );
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Skills Hub</h1>
            <p className="text-muted-foreground mt-1">
              Browse and explore all available training skills
            </p>
          </div>
          {(isAdmin || isTrainer) && (
            <Button
              variant="outline"
              onClick={() => navigate("/admin-skills")}
            >
              <Edit className="h-4 w-4 mr-2" />
              Manage Skills
            </Button>
          )}
        </div>

        {/* Mandatory Skills Section */}
        {mandatorySkills.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-sm px-3 py-1">
                Mandatory
              </Badge>
              <h2 className="text-xl font-semibold text-foreground">
                Mandatory Skills ({mandatorySkills.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mandatorySkills.map((skill) => renderSkillCard(skill))}
            </div>
          </div>
        )}

        {/* Optional Skills Section */}
        {optionalSkills.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                Optional
              </Badge>
              <h2 className="text-xl font-semibold text-foreground">
                Optional Skills ({optionalSkills.length})
              </h2>
              </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {optionalSkills.map((skill) => renderSkillCard(skill))}
              </div>
              </div>
        )}

        {/* Empty State */}
        {skills.length === 0 && (
          <GlassCard>
            <GlassCardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No skills available yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Skills will appear here once they are added by an administrator.
              </p>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* PDF Viewer Dialog */}
        <Dialog open={!!selectedPdf} onOpenChange={(open) => !open && setSelectedPdf(null)}>
          <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-6xl max-h-[85dvh] p-0 overflow-y-auto">
            <DialogHeader className="px-6 pt-6">
              <div className="flex items-center justify-between">
                <DialogTitle>{selectedPdf?.skillName} - Training Plan</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedPdf(null)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </DialogHeader>
            <div className="px-6 pb-6">
              {selectedPdf && getPdfUrl(selectedPdf.pdfPath) && (
                <iframe
                  src={getPdfUrl(selectedPdf.pdfPath) || ""}
                  className="w-full h-[70vh] rounded-lg border border-border"
                  title={`${selectedPdf.skillName} Training Plan`}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
