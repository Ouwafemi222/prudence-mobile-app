import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen,
  Edit,
  Save,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { scopeToUserOffice } from "@/lib/tenantScope";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  is_mandatory: boolean | null;
  training_plan_pdf_path: string | null;
  trainers: string[] | null;
  created_at: string;
  updated_at: string;
}

export default function AdminSkills() {
  const auth = useAuth();
  const isAdmin = auth?.isAdmin ?? false;
  const isTrainer = auth?.isTrainer ?? false;
  const authLoading = auth?.loading ?? true;
  const officeId = auth?.officeId ?? null;
  const isSuperAdmin = auth?.isSuperAdmin ?? false;
  
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    overview: "",
    theory: "",
    practical: "",
    tools: "",
    outcomes: "",
    display_order: 0,
    is_active: true,
    is_mandatory: false,
    trainers: [] as string[],
  });

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("skills")
        .select("*")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      query = scopeToUserOffice(query, officeId, isSuperAdmin);
      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("Skills fetch error:", fetchError);
        setError(fetchError.message || "Failed to fetch skills");
        toast.error(`Failed to load skills: ${fetchError.message || fetchError}`);
        setSkills([]);
        return;
      }
      
      setSkills(data || []);
    } catch (err: unknown) {
      console.error("Error fetching skills:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      toast.error(`Failed to load skills: ${errorMessage}`);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [officeId, isSuperAdmin]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // Check permissions
    if (!isAdmin && !isTrainer) {
      setLoading(false);
      return;
    }

    // Fetch skills if user has permission
    fetchSkills();
  }, [authLoading, isAdmin, isTrainer, fetchSkills]);

  const handleEdit = (skill: Skill) => {
    setSelectedSkill(skill);
    setFormData({
      name: skill.name,
      overview: skill.overview || "",
      theory: skill.theory || "",
      practical: skill.practical || "",
      tools: skill.tools || "",
      outcomes: skill.outcomes || "",
      display_order: skill.display_order,
      is_active: skill.is_active,
      is_mandatory: skill.is_mandatory || false,
      trainers: skill.trainers || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedSkill) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("skills")
        .update({
          name: formData.name,
          overview: formData.overview || null,
          theory: formData.theory || null,
          practical: formData.practical || null,
          tools: formData.tools || null,
          outcomes: formData.outcomes || null,
          display_order: formData.display_order,
          is_active: formData.is_active,
          is_mandatory: formData.is_mandatory,
          trainers: formData.trainers.length > 0 ? formData.trainers : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedSkill.id);

      if (error) throw error;

      toast.success("Skill updated successfully");
      setIsEditDialogOpen(false);
      setSelectedSkill(null);
      await fetchSkills();
    } catch (error: any) {
      console.error("Error updating skill:", error);
      toast.error(`Failed to update skill: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (skill: Skill) => {
    try {
      const { error } = await supabase
        .from("skills")
        .update({ is_active: !skill.is_active })
        .eq("id", skill.id);

      if (error) throw error;

      toast.success(`Skill ${skill.is_active ? "deactivated" : "activated"}`);
      await fetchSkills();
    } catch (error: any) {
      console.error("Error toggling skill:", error);
      toast.error("Failed to update skill status");
    }
  };

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Check permissions
  if (!isAdmin && !isTrainer) {
    return (
      <AppLayout>
        <GlassCard>
          <GlassCardContent className="py-12 text-center">
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </GlassCardContent>
        </GlassCard>
      </AppLayout>
    );
  }

  // Show loading while fetching skills
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Show error if fetch failed
  if (error) {
    return (
      <AppLayout>
        <GlassCard>
          <GlassCardContent className="py-12 text-center">
            <p className="text-destructive mb-4">Error: {error}</p>
            <Button onClick={() => fetchSkills()}>Retry</Button>
          </GlassCardContent>
        </GlassCard>
      </AppLayout>
    );
  }

  console.log("AdminSkills: About to render main content", { skillsCount: skills.length, loading, error });
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Skills</h1>
            <p className="text-muted-foreground mt-1">
              Edit skill details, overview, theory, practical, tools, and outcomes
            </p>
          </div>
        </div>

        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>All Skills</GlassCardTitle>
            <GlassCardDescription>
              Click on a skill to edit its details
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            {(() => {
              console.log("AdminSkills: Rendering table, skills count:", skills.length);
              try {
                return (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Display Order</TableHead>
                        <TableHead>Trainers</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {skills.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No skills found
                          </TableCell>
                        </TableRow>
                      ) : (
                        skills.map((skill) => {
                          console.log("AdminSkills: Rendering skill row:", skill.name);
                          return (
                            <TableRow key={skill.id} className="cursor-pointer" onClick={() => handleEdit(skill)}>
                              <TableCell className="font-medium">{skill.name}</TableCell>
                              <TableCell>
                                <Badge variant={skill.is_mandatory ? "default" : "secondary"}>
                                  {skill.is_mandatory ? "Mandatory" : "Optional"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={skill.is_active ? "default" : "secondary"}>
                                  {skill.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>{skill.display_order}</TableCell>
                              <TableCell>
                                {skill.trainers && skill.trainers.length > 0 ? (
                                  <span className="text-sm text-muted-foreground">
                                    {skill.trainers.length} trainer{skill.trainers.length > 1 ? "s" : ""}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">No trainers</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(skill)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleActive(skill)}
                                  >
                                    {skill.is_active ? "Deactivate" : "Activate"}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  </div>
                );
              } catch (err) {
                console.error("AdminSkills: Error rendering table:", err);
                return <div className="text-destructive">Error rendering table: {String(err)}</div>;
              }
            })()}
          </GlassCardContent>
        </GlassCard>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-4xl max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Skill: {selectedSkill?.name}</DialogTitle>
              <DialogDescription>
                Update the skill details, content, and settings
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Skill Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overview">Overview</Label>
                <Textarea
                  id="overview"
                  value={formData.overview}
                  onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
                  rows={3}
                  placeholder="Brief description of the skill..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="theory">Theory (one per line or comma-separated)</Label>
                <Textarea
                  id="theory"
                  value={formData.theory}
                  onChange={(e) => setFormData({ ...formData, theory: e.target.value })}
                  rows={5}
                  placeholder="Theory modules, one per line..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="practical">Practical (one per line or comma-separated)</Label>
                <Textarea
                  id="practical"
                  value={formData.practical}
                  onChange={(e) => setFormData({ ...formData, practical: e.target.value })}
                  rows={5}
                  placeholder="Practical exercises, one per line..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tools">Tools (one per line or comma-separated)</Label>
                <Textarea
                  id="tools"
                  value={formData.tools}
                  onChange={(e) => setFormData({ ...formData, tools: e.target.value })}
                  rows={3}
                  placeholder="Tools and technologies, one per line..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outcomes">Learning Outcomes (one per line or comma-separated)</Label>
                <Textarea
                  id="outcomes"
                  value={formData.outcomes}
                  onChange={(e) => setFormData({ ...formData, outcomes: e.target.value })}
                  rows={4}
                  placeholder="What learners will achieve, one per line..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trainers">Trainers (one per line)</Label>
                <Textarea
                  id="trainers"
                  value={formData.trainers.join("\n")}
                  onChange={(e) => setFormData({ ...formData, trainers: e.target.value.split("\n").filter(t => t.trim()) })}
                  rows={3}
                  placeholder="Trainer names, one per line..."
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_mandatory"
                    checked={formData.is_mandatory}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_mandatory: checked as boolean })}
                  />
                  <Label htmlFor="is_mandatory">Mandatory</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
