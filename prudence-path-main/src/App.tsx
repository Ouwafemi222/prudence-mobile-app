import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealtimeSyncProvider } from "@/contexts/RealtimeSyncContext";
import { ProtectedRoute, PublicOnlyRoute, WaitingApprovalRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import MarketingFeatures from "./pages/marketing/Features";
import MarketingAbout from "./pages/marketing/About";
import MarketingHowItWorks from "./pages/marketing/HowItWorks";
import MarketingFaq from "./pages/marketing/Faq";
import MarketingApply from "./pages/marketing/Apply";
import MarketingPricing from "./pages/marketing/Pricing";
import MarketingDemo from "./pages/marketing/Demo";
import Dashboard from "./pages/Dashboard";
import DailyActivity from "./pages/DailyActivity";
import WeeklyReports from "./pages/WeeklyReports";
import MonthlyGoals from "./pages/MonthlyGoals";
import SkillsHub from "./pages/SkillsHub";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import WaitingApproval from "./pages/WaitingApproval";
import Teams from "./pages/Teams";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import SponsorDashboard from "./pages/SponsorDashboard";
import MySubmissions from "./pages/MySubmissions";
import Submissions from "./pages/Submissions";
import DailyTodo from "./pages/DailyTodo";
import NotFound from "./pages/NotFound";
import Suggestions from "./pages/Suggestions";
import OfficeRules from "./pages/OfficeRules";
import ProRequirements from "./pages/ProRequirements";
import Timetable from "./pages/Timetable";
import AdminSkills from "./pages/AdminSkills";
import AdminDashboard from "./pages/AdminDashboard";
import AdminOfficeApplications from "./pages/AdminOfficeApplications";
import AdminOffices from "./pages/AdminOffices";
import OfficeAdmin from "./pages/OfficeAdmin";
import AdminMonthlyGoals from "./pages/AdminMonthlyGoals";
import GroupTodosReports from "./pages/GroupTodosReports";
import AccountRejected from "./pages/AccountRejected";
import TrainerGroupWeekly from "./pages/TrainerGroupWeekly";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RealtimeSyncProvider>
          <Routes>
            {/* Public marketing routes */}
            <Route path="/" element={<Index />} />
            <Route path="/features" element={<MarketingFeatures />} />
            <Route path="/about" element={<MarketingAbout />} />
            <Route path="/how-it-works" element={<MarketingHowItWorks />} />
            <Route path="/faq" element={<MarketingFaq />} />
            <Route path="/apply" element={<MarketingApply />} />
            <Route path="/pricing" element={<MarketingPricing />} />
            <Route path="/demo" element={<MarketingDemo />} />
            
            {/* Auth route - only accessible when NOT logged in */}
            <Route
              path="/auth"
              element={
                <PublicOnlyRoute>
                  <Auth />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/auth/reset-password"
              element={<ResetPassword />}
            />
            
            {/* Waiting approval - logged in but not approved */}
            <Route
              path="/waiting-approval"
              element={
                <WaitingApprovalRoute>
                  <WaitingApproval />
                </WaitingApprovalRoute>
              }
            />
            
            {/* Protected routes - require auth and approval */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily-activity"
              element={
                <ProtectedRoute>
                  <DailyActivity />
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily-todo"
              element={
                <ProtectedRoute>
                  <DailyTodo />
                </ProtectedRoute>
              }
            />

            <Route path="/suggestions" element={<Suggestions />} />
            <Route
              path="/account-rejected"
              element={
                <ProtectedRoute requireApproval={false}>
                  <AccountRejected />
                </ProtectedRoute>
              }
            />
            <Route
              path="/weekly-reports"
              element={
                <ProtectedRoute>
                  <WeeklyReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/monthly-goals"
              element={
                <ProtectedRoute>
                  <MonthlyGoals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/skills-hub"
              element={
                <ProtectedRoute>
                  <SkillsHub />
                </ProtectedRoute>
              }
            />
            <Route
              path="/office-rules"
              element={
                <ProtectedRoute>
                  <OfficeRules />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pro-requirements"
              element={
                <ProtectedRoute>
                  <ProRequirements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/timetable"
              element={
                <ProtectedRoute>
                  <Timetable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sponsor-dashboard"
              element={
                <ProtectedRoute>
                  <SponsorDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Admin-only routes */}
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "trainer"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-offices"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <AdminOffices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/office-admin"
              element={
                <ProtectedRoute allowedRoles={["office_admin", "super_admin"]}>
                  <OfficeAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-office-applications"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <AdminOfficeApplications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-monthly-goals"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "trainer"]}>
                  <AdminMonthlyGoals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-skills"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "trainer"]}>
                  <AdminSkills />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "trainer"]}>
                  <Teams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submissions"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "trainer", "pro", "sponsor"]}>
                  <Submissions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/group-todos-reports"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "trainer", "pro"]}>
                  <GroupTodosReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trainer-group-weekly"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "trainer"]}>
                  <TrainerGroupWeekly />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-submissions"
              element={
                <ProtectedRoute>
                  <MySubmissions />
                </ProtectedRoute>
              }
            />
            
            {/* Profile & Settings */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </RealtimeSyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
