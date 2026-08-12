import { AppLayout } from "@/components/layout/AppLayout";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  Settings,
  ExternalLink,
  FileText,
  LayoutGrid,
  Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Target } from "lucide-react";
import { AdminIncomeOverview } from "@/components/admin/AdminIncomeOverview";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, isTrainer, userRole } = useAuth();
  const isSuperAdmin = userRole?.role === "super_admin";

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

  const adminCards = [
    ...(isSuperAdmin
      ? [
          {
            title: "Platform Offices",
            description: "View all tenant workspaces, member counts, and signup links",
            icon: <Building2 className="h-6 w-6 text-primary" />,
            href: "/admin-offices",
            color: "bg-chart-4/10",
          },
          {
            title: "Office Applications",
            description: "Review /apply submissions and provision new office workspaces",
            icon: <Building2 className="h-6 w-6 text-primary" />,
            href: "/admin-office-applications",
            color: "bg-chart-3/10",
          },
        ]
      : []),
    {
      title: "All Members Monthly Report & Goals",
      description: "View monthly targets and performance for any member, any month",
      icon: <Target className="h-6 w-6 text-primary" />,
      href: "/admin-monthly-goals",
      color: "bg-chart-2/10",
    },
    {
      title: "Team Management",
      description: "Approve members, assign roles, groups, and manage team structure",
      icon: <Users className="h-6 w-6 text-primary" />,
      href: "/teams",
      color: "bg-primary/10",
    },
    {
      title: "Manage Skills",
      description: "Edit skill details, overview, theory, practical, tools, and outcomes",
      icon: <BookOpen className="h-6 w-6 text-primary" />,
      href: "/admin-skills",
      color: "bg-primary/10",
    },
    {
      title: "Submissions",
      description: "View all daily submissions, filter by date, and track team activity",
      icon: <FileText className="h-6 w-6 text-primary" />,
      href: "/submissions",
      color: "bg-primary/10",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage teams, skills, submissions, and system operations
          </p>
        </div>

        {isSuperAdmin && <AdminIncomeOverview />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminCards.map((card) => (
            <GlassCard key={card.href} className="hover:shadow-lg transition-shadow">
              <GlassCardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${card.color}`}>
                    {card.icon}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(card.href)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <GlassCardTitle className="mt-4">{card.title}</GlassCardTitle>
                <GlassCardDescription>{card.description}</GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(card.href)}
                >
                  Open {card.title}
                </Button>
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>

        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Quick Actions</GlassCardTitle>
            <GlassCardDescription>
              Common administrative tasks
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() => navigate("/teams")}
              >
                <Users className="h-5 w-5 text-primary" />
                <span className="font-semibold">Manage Teams</span>
                <span className="text-xs text-muted-foreground text-left">
                  Approve, assign roles, groups
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() => navigate("/admin-skills")}
              >
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-semibold">Edit Skills</span>
                <span className="text-xs text-muted-foreground text-left">
                  Update skill content
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() => navigate("/submissions")}
              >
                <LayoutGrid className="h-5 w-5 text-primary" />
                <span className="font-semibold">View Submissions</span>
                <span className="text-xs text-muted-foreground text-left">
                  Track all activities
                </span>
              </Button>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
