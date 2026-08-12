import { useState, useEffect, useCallback } from "react";
import { useRealtimeRefresh } from "@/contexts/RealtimeSyncContext";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  TrendingUp,
  Check,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link?: string | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  reminder: <Clock className="h-5 w-5 text-warning" />,
  verification: <CheckCircle2 className="h-5 w-5 text-chart-1" />,
  summary: <TrendingUp className="h-5 w-5 text-chart-2" />,
  alert: <AlertCircle className="h-5 w-5 text-destructive" />,
  feedback: <MessageSquare className="h-5 w-5 text-primary" />,
};

const typeColors: Record<string, string> = {
  reminder: "bg-warning/10 text-warning",
  verification: "bg-chart-1/10 text-chart-1",
  summary: "bg-chart-2/10 text-chart-2",
  alert: "bg-destructive/10 text-destructive",
  feedback: "bg-primary/10 text-primary",
};

export default function Notifications() {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
    } else {
      setNotifications(data as Notification[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
  }, [userId, fetchNotifications]);

  useRealtimeRefresh(fetchNotifications, ["notifications"]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      toast.error("Failed to mark as read");
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const getDefaultLinkForType = (type: string): string => {
    switch (type) {
      case "reminder":
        return "/daily-activity";
      case "verification":
      case "feedback":
        return "/my-submissions";
      case "summary":
        return "/weekly-reports";
      default:
        return "/dashboard";
    }
  };

  const handleOpenNotification = async (n: Notification) => {
    try {
      if (!n.is_read) await markAsRead(n.id);
    } finally {
      const link = (n.link || "").trim() || getDefaultLinkForType(n.type);
      navigate(link);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      toast.error("Failed to mark all as read");
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.is_read;
    return n.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              Stay updated with your activity alerts
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <GlassCard>
            <GlassCardContent className="py-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {notifications.length}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="py-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
                <p className="text-sm text-muted-foreground">Unread</p>
              </div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="py-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-chart-1/10">
                <CheckCircle2 className="h-6 w-6 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {notifications.filter((n) => n.type === "verification").length}
                </p>
                <p className="text-sm text-muted-foreground">Verifications</p>
              </div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="py-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-chart-2/10">
                <TrendingUp className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {notifications.filter((n) => n.type === "summary").length}
                </p>
                <p className="text-sm text-muted-foreground">Summaries</p>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Notifications List */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              All Notifications
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <Tabs value={filter} onValueChange={setFilter} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
                <TabsTrigger value="reminder">Reminders</TabsTrigger>
                <TabsTrigger value="verification">Verifications</TabsTrigger>
              </TabsList>

              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading notifications...
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleOpenNotification(notification)}
                      className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${
                        notification.is_read
                          ? "bg-accent/30"
                          : "bg-accent/50 border-l-4 border-primary"
                      } hover:bg-accent/60 text-left w-full`}
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          typeColors[notification.type] || "bg-muted"
                        }`}
                      >
                        {typeIcons[notification.type] || (
                          <Bell className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {formatTime(notification.created_at)}
                            </span>
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`mt-2 ${typeColors[notification.type]}`}
                        >
                          {notification.type}
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Tabs>
          </GlassCardContent>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
