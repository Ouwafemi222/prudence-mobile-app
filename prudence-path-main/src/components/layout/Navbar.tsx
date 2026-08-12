import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Target,
  BookOpen,
  Bell,
  Menu,
  X,
  LogOut,
  Settings,
  User,
  LayoutGrid,
  Users,
  Info,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const primaryNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Team", href: "/teams", icon: <Users className="h-4 w-4" />, roles: ["super_admin", "trainer"] },
  { label: "Group Weekly", href: "/trainer-group-weekly", icon: <Calendar className="h-4 w-4" />, roles: ["super_admin", "trainer"] },
];

const workNav: NavItem[] = [
  { label: "Daily Todo", href: "/daily-todo", icon: <FileText className="h-4 w-4" /> },
  { label: "Daily Activity", href: "/daily-activity", icon: <FileText className="h-4 w-4" /> },
];

const reportsNav: NavItem[] = [
  { label: "My Submissions", href: "/my-submissions", icon: <LayoutGrid className="h-4 w-4" /> },
  { label: "Weekly Reports", href: "/weekly-reports", icon: <Calendar className="h-4 w-4" /> },
  { label: "Monthly Report & Goals", href: "/monthly-goals", icon: <Target className="h-4 w-4" /> },
];

const resourcesNav: NavItem[] = [
  { label: "Skills Hub", href: "/skills-hub", icon: <BookOpen className="h-4 w-4" /> },
  { label: "Office Rules", href: "/office-rules", icon: <FileText className="h-4 w-4" /> },
  { label: "Timetable", href: "/timetable", icon: <Calendar className="h-4 w-4" /> },
  { label: "Pro Requirements", href: "/pro-requirements", icon: <Target className="h-4 w-4" /> },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, office, userRole, isAdmin, isTrainer, signOut } = useAuth();
  const isSuperAdmin = userRole?.role === "super_admin";

  const dashboards: NavItem[] = [
    { label: "Admin Dashboard", href: "/admin-dashboard", icon: <LayoutDashboard className="h-4 w-4" />, roles: ["super_admin", "trainer"] },
    { label: "Submissions", href: "/submissions", icon: <LayoutGrid className="h-4 w-4" />, roles: ["super_admin", "trainer", "pro", "sponsor"] },
    { label: "Group Todos & Reports", href: "/group-todos-reports", icon: <Users className="h-4 w-4" />, roles: ["super_admin", "trainer", "pro"] },
    // Keep visible for all logged-in users; downlines will just be empty if they don't have any yet.
    { label: "Sponsor Dashboard", href: "/sponsor-dashboard", icon: <LayoutGrid className="h-4 w-4" /> },
    { label: "Team Management", href: "/teams", icon: <LayoutGrid className="h-4 w-4" />, roles: ["super_admin", "trainer"] },
    { label: "Suggestions (Admin)", href: "/suggestions", icon: <LayoutGrid className="h-4 w-4" />, roles: ["super_admin"] },
    { label: "Platform Offices", href: "/admin-offices", icon: <Building2 className="h-4 w-4" />, roles: ["super_admin"] },
    { label: "Office Applications", href: "/admin-office-applications", icon: <Building2 className="h-4 w-4" />, roles: ["super_admin"] },
    { label: "Office Admin", href: "/office-admin", icon: <Building2 className="h-4 w-4" />, roles: ["office_admin", "super_admin"] },
    { label: "All Monthly Goals", href: "/admin-monthly-goals", icon: <Target className="h-4 w-4" />, roles: ["super_admin", "trainer"] },
  ];

  const filteredDashboards = dashboards.filter(
    (item) => !item.roles || (userRole && item.roles.includes(userRole.role))
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getAvatarUrl = () => {
    if (profile?.avatar_url) {
      return supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl;
    }
    return "";
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase();
    }
    return "?";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
            <Logo showWordmark size="sm" wordmarkClassName="hidden sm:block" />
            {office?.name && (
              <span className="hidden md:inline text-sm text-muted-foreground truncate max-w-[140px] lg:max-w-[200px]">
                · {office.name}
              </span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {primaryNav
              .filter((item) => !item.roles || (userRole && item.roles.includes(userRole.role)))
              .map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  location.pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent">
                  <FileText className="h-4 w-4" />
                  Work
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 glass-card" align="start" forceMount>
                {workNav.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link to={item.href} className="flex items-center gap-2 cursor-pointer">
                      {item.icon}
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent">
                  <Calendar className="h-4 w-4" />
                  Reports
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 glass-card" align="start" forceMount>
                {reportsNav.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link to={item.href} className="flex items-center gap-2 cursor-pointer">
                      {item.icon}
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent">
                  <Info className="h-4 w-4" />
                  Resources
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 glass-card" align="start" forceMount>
                {resourcesNav.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link to={item.href} className="flex items-center gap-2 cursor-pointer">
                      {item.icon}
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {filteredDashboards.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent">
                    <LayoutGrid className="h-4 w-4" />
                    Dashboards
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 glass-card" align="start" forceMount>
                  {filteredDashboards.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link to={item.href} className="flex items-center gap-2 cursor-pointer">
                        {item.icon}
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Link to="/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  0
                </span>
              </Button>
            </Link>

            {/* Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={getAvatarUrl()} alt={profile?.full_name || "User"} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 glass-card" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-foreground">{profile?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">@{profile?.username || "unknown"}</p>
                    {office?.name && (
                      <p className="text-xs text-muted-foreground truncate">{office.name}</p>
                    )}
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize mt-1">
                      {userRole?.role?.replace("_", " ") || "member"}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                {filteredDashboards.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Dashboards
                    </div>
                    <DropdownMenuGroup>
                      {filteredDashboards.map((item) => (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link to={item.href} className="flex items-center gap-2 cursor-pointer">
                            {item.icon}
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/notifications" className="flex items-center gap-2 cursor-pointer">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border/50 max-h-[70dvh] overflow-y-auto overscroll-contain">
            <div className="flex flex-col gap-1">
              {primaryNav
                .filter((item) => !item.roles || (userRole && item.roles.includes(userRole.role)))
                .map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      location.pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Work
              </p>
              {workNav.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    location.pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Reports
              </p>
              {reportsNav.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    location.pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Resources
              </p>
              {resourcesNav.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    location.pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              {filteredDashboards.length > 0 && (
                <>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Dashboards
                  </p>
                  {filteredDashboards.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                        location.pathname === item.href
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent",
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
