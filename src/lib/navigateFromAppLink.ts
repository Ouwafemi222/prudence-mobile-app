import { navigationRef } from "../navigation/navigationRef";
import { openSitePath } from "./openSite";

const MARKETING = new Set([
  "/",
  "/features",
  "/about",
  "/how-it-works",
  "/faq",
  "/apply",
  "/pricing",
  "/demo",
]);

function pathOf(link: string): string {
  if (link.startsWith("http")) {
    try {
      return new URL(link).pathname || "/";
    } catch {
      return link;
    }
  }
  return link.startsWith("/") ? link.split("?")[0] : `/${link.split("?")[0]}`;
}

/** Navigate an in-app notification `link` (website path) to the matching native screen. */
export function navigateFromAppLink(link: string | null | undefined): void {
  if (!link) return;
  const path = pathOf(link);
  if (MARKETING.has(path)) {
    void openSitePath(path);
    return;
  }
  if (!navigationRef.isReady()) return;

  const nav = navigationRef.navigate as (name: string, params?: object) => void;

  switch (path) {
    case "/dashboard":
      nav("App", { screen: "MainTabs", params: { screen: "Home" } });
      return;
    case "/account-rejected":
      nav("AccountRejected");
      return;
    case "/assistant":
    case "/ask":
      nav("App", { screen: "AssistantChat" });
      return;
    case "/my-submissions":
      nav("App", { screen: "MySubmissions" });
      return;
    case "/daily-todo":
    case "/daily-activity":
      nav("App", { screen: "MainTabs", params: { screen: "Work" } });
      return;
    case "/weekly-reports":
    case "/monthly-goals":
      nav("App", { screen: "MainTabs", params: { screen: "Reports", params: { tab: "monthly" } } });
      return;
    case "/notifications":
      nav("App", { screen: "NotificationsInbox" });
      return;
    case "/profile":
      nav("App", { screen: "MainTabs", params: { screen: "Profile" } });
      return;
    case "/suggestions":
      nav("App", { screen: "Suggestions" });
      return;
    case "/sponsor-dashboard":
      nav("App", { screen: "SponsorDashboard" });
      return;
    case "/teams":
      nav("App", { screen: "Teams" });
      return;
    case "/teams/members":
      nav("App", { screen: "TeamMembers" });
      return;
    case "/submissions":
      nav("App", { screen: "SubmissionsReview" });
      return;
    case "/group-todos-reports":
      nav("App", { screen: "GroupTodosReports" });
      return;
    case "/trainer-group-weekly":
      nav("App", { screen: "TrainerGroupWeekly" });
      return;
    case "/admin-dashboard":
      nav("App", { screen: "AdminDashboard" });
      return;
    case "/admin-offices":
      nav("App", { screen: "AdminOffices" });
      return;
    case "/office-admin":
      nav("App", { screen: "OfficeAdmin" });
      return;
    case "/admin-office-applications":
      nav("App", { screen: "AdminOfficeApplications" });
      return;
    case "/admin-monthly-goals":
      nav("App", { screen: "AdminMonthlyGoals" });
      return;
    case "/admin-skills":
      nav("App", { screen: "AdminSkills" });
      return;
    default:
      if (path.startsWith("/skills-hub") || path.startsWith("/office-rules") || path.startsWith("/timetable") || path.startsWith("/pro-requirements")) {
        nav("App", { screen: "MainTabs", params: { screen: "Resources" } });
      }
  }
}
