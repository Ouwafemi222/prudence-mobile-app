import { useState, useRef, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Mail,
  AtSign,
  Calendar,
  Upload,
  Shield,
  Bell,
  Lock,
  Save,
  Loader2,
  Settings,
  Users,
  CheckCircle,
  ExternalLink,
  BookOpen,
  Eye,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ImageDropzone } from "@/components/ui/image-dropzone";

interface UserSkill {
  skill_id: string;
  skill_name: string;
  status: string;
  is_mandatory: boolean;
  training_plan_pdf_path: string | null;
  trainers: string[] | null;
}

export default function Profile() {
  const { profile, userRole, user, refreshProfile, isAdmin, isTrainer } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<{ skillName: string; pdfPath: string } | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || "",
    email: profile?.email || user?.email || "",
    bio: "",
  });

  const [notifications, setNotifications] = useState({
    dailyReminders: true,
    verificationAlerts: true,
    weeklySummary: true,
    teamUpdates: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const getAvatarUrl = () => {
    if (profile?.avatar_url) {
      return supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl;
    }
    return "";
  };

  const uploadAvatarFile = async (file: File) => {
    if (!user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload avatar");
      setIsUploading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: fileName })
      .eq("user_id", user.id);

    if (updateError) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Avatar uploaded successfully!");
      await refreshProfile();
    }

    setIsUploading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadAvatarFile(file);
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);

    const emailChanged = formData.email.trim() !== (profile?.email || user.email || "").trim();
    if (emailChanged && formData.email.trim()) {
      const { error: authEmailError } = await supabase.auth.updateUser({
        email: formData.email.trim(),
      });
      if (authEmailError) {
        setIsLoading(false);
        toast.error("Failed to update login email", { description: authEmailError.message });
        return;
      }
      toast.info("Check your inbox to confirm your new email address.");
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.fullName,
        email: formData.email.trim() || null,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully!");
      await refreshProfile();
    }

    setIsLoading(false);
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchUserSkills();
    }
  }, [user]);

  const fetchUserSkills = async () => {
    if (!user) return;
    setSkillsLoading(true);
    try {
      const { data: userSkillsData, error } = await supabase
        .from("user_skills")
        .select(`
          skill_id,
          status,
          skills (
            id,
            name,
            is_mandatory,
            training_plan_pdf_path,
            trainers
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const skillsList: UserSkill[] = (userSkillsData || []).map((us: any) => ({
        skill_id: us.skill_id,
        skill_name: us.skills?.name || "Unknown",
        status: us.status,
        is_mandatory: us.skills?.is_mandatory || false,
        training_plan_pdf_path: us.skills?.training_plan_pdf_path || null,
        trainers: us.skills?.trainers || null,
      }));

      setUserSkills(skillsList);
    } catch (error: any) {
      console.error("Error fetching user skills:", error);
    } finally {
      setSkillsLoading(false);
    }
  };

  const getPdfUrl = (pdfPath: string | null): string | null => {
    if (!pdfPath) return null;
    return supabase.storage.from("training-plans").getPublicUrl(pdfPath).data.publicUrl;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "yet_to_begin":
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Yet to Begin</Badge>;
      case "started_training":
        return <Badge variant="secondary" className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Started Training</Badge>;
      case "completed_training":
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Completed Training</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile & Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="skills">My Skills</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Avatar Card */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle>Profile Picture</GlassCardTitle>
                <GlassCardDescription>
                  Upload a photo to personalize your account
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                    <AvatarImage src={getAvatarUrl()} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground text-2xl">
                      {profile?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-3 flex-1 min-w-0">
                    <ImageDropzone
                      files={[]}
                      onFilesChange={(files) => {
                        if (files[0]) void uploadAvatarFile(files[0]);
                      }}
                      multiple={false}
                      disabled={isUploading}
                      label="Drop a photo here or tap to upload"
                      className="max-w-sm"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Photo
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG or GIF. Max size 5MB.
                    </p>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Basic Info Card */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle>Basic Information</GlassCardTitle>
                <GlassCardDescription>
                  Update your personal details
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        className="pl-9"
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-9"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">
                      Username
                      <Badge variant="outline" className="ml-2 text-xs">
                        Cannot be changed
                      </Badge>
                    </Label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="username"
                        className="pl-9"
                        value={profile?.username || ""}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sponsor">
                      Sponsor Username
                      <Badge variant="outline" className="ml-2 text-xs">
                        Cannot be changed
                      </Badge>
                    </Label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="sponsor"
                        className="pl-9"
                        value={profile?.sponsor_username || ""}
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Account Info */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle>Account Information</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-accent/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Role</span>
                    </div>
                    <p className="font-semibold text-foreground capitalize">
                      {userRole?.role?.replace("_", " ") || "Member"}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-accent/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Joined</span>
                    </div>
                    <p className="font-semibold text-foreground">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-accent/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        className={
                          profile?.approval_status === "approved"
                            ? "bg-chart-1/10 text-chart-1"
                            : "bg-warning/10 text-warning"
                        }
                      >
                        {profile?.approval_status || "Pending"}
                      </Badge>
                    </div>
                    <p className="font-semibold text-foreground">Account Status</p>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Admin Dashboard Section */}
            {(isAdmin || isTrainer) && (
              <GlassCard>
                <GlassCardHeader>
                  <GlassCardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Admin Dashboard
                  </GlassCardTitle>
                  <GlassCardDescription>
                    Manage teams, verify submissions, and oversee system operations
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-accent/50 transition-colors"
                      onClick={() => navigate("/teams")}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Users className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Teams Management</span>
                        <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground text-left">
                        Approve members, assign roles, and manage team structure
                      </p>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-accent/50 transition-colors"
                      onClick={() => navigate("/verification")}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Verification</span>
                        <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground text-left">
                        Review and verify daily activity submissions
                      </p>
                    </Button>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* My Skills Tab */}
          <TabsContent value="skills" className="space-y-6">
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  My Skills
                </GlassCardTitle>
                <GlassCardDescription>
                  View your assigned skills and training progress
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                {skillsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : userSkills.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground">No skills assigned yet.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Skills will appear here once they are assigned by an administrator.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Mandatory Skills */}
                    {userSkills.filter((s) => s.is_mandatory).length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">Mandatory</Badge>
                          <h3 className="font-semibold text-foreground">Mandatory Skills</h3>
                        </div>
                        {userSkills
                          .filter((s) => s.is_mandatory)
                          .map((skill) => (
                            <div key={skill.skill_id} className="p-4 rounded-xl bg-accent/30 border border-border/50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-foreground">{skill.skill_name}</h4>
                                    {getStatusBadge(skill.status)}
                                  </div>
                                  {skill.trainers && skill.trainers.length > 0 && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                                      <Users className="h-4 w-4" />
                                      Trainers: {skill.trainers.join(", ")}
                                    </p>
                                  )}
                                </div>
                                {skill.training_plan_pdf_path && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setSelectedPdf({
                                        skillName: skill.skill_name,
                                        pdfPath: skill.training_plan_pdf_path!,
                                      })
                                    }
                                    className="ml-4"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View PDF
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Optional Skills */}
                    {userSkills.filter((s) => !s.is_mandatory).length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Optional</Badge>
                          <h3 className="font-semibold text-foreground">Optional Skills</h3>
                        </div>
                        {userSkills
                          .filter((s) => !s.is_mandatory)
                          .map((skill) => (
                            <div key={skill.skill_id} className="p-4 rounded-xl bg-accent/30 border border-border/50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-foreground">{skill.skill_name}</h4>
                                    {getStatusBadge(skill.status)}
                                  </div>
                                  {skill.trainers && skill.trainers.length > 0 && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                                      <Users className="h-4 w-4" />
                                      Trainers: {skill.trainers.join(", ")}
                                    </p>
                                  )}
                                </div>
                                {skill.training_plan_pdf_path && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setSelectedPdf({
                                        skillName: skill.skill_name,
                                        pdfPath: skill.training_plan_pdf_path!,
                                      })
                                    }
                                    className="ml-4"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View PDF
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>

            {/* PDF Viewer Dialog */}
            {selectedPdf && (
              <Dialog open={!!selectedPdf} onOpenChange={(open) => !open && setSelectedPdf(null)}>
                <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-6xl max-h-[85dvh] p-0 overflow-y-auto">
                  <DialogHeader className="px-6 pt-6">
                    <DialogTitle>{selectedPdf.skillName} - Training Plan</DialogTitle>
                  </DialogHeader>
                  <div className="px-6 pb-6">
                    {getPdfUrl(selectedPdf.pdfPath) && (
                      <iframe
                        src={getPdfUrl(selectedPdf.pdfPath) || ""}
                        className="w-full h-[70vh] rounded-lg border border-border"
                        title={`${selectedPdf.skillName} Training Plan`}
                      />
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notification Preferences
                </GlassCardTitle>
                <GlassCardDescription>
                  Choose what notifications you want to receive
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Daily Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Get reminded to submit your daily report
                    </p>
                  </div>
                  <Switch
                    checked={notifications.dailyReminders}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, dailyReminders: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Verification Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Notifications when your reports are verified
                    </p>
                  </div>
                  <Switch
                    checked={notifications.verificationAlerts}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        verificationAlerts: checked,
                      })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Weekly Summary</p>
                    <p className="text-sm text-muted-foreground">
                      Receive a summary of your weekly performance
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklySummary}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, weeklySummary: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Team Updates</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified about team member activities
                    </p>
                  </div>
                  <Switch
                    checked={notifications.teamUpdates}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, teamUpdates: checked })
                    }
                  />
                </div>
              </GlassCardContent>
            </GlassCard>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Change Password
                </GlassCardTitle>
                <GlassCardDescription>
                  Update your password to keep your account secure
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                  />
                </div>
                <Button onClick={handlePasswordChange} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </GlassCardContent>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
