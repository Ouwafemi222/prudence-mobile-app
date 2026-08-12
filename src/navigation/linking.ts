import * as Linking from "expo-linking";
import type { LinkingOptions } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

export const navigationLinking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL("/"), "prudence://"],
  config: {
    screens: {
      Welcome: "welcome",
      Auth: {
        path: "auth",
        parse: {
          tab: (value: string) => (value === "signup" || value === "forgot" ? value : "signin"),
          office: (value: string) => value.toLowerCase(),
          sponsor: (value: string) => value.toLowerCase(),
          confirmed: (value: string) => value,
        },
      },
      ResetPassword: "auth/reset-password",
      WaitingApproval: "waiting-approval",
      AccountRejected: "account-rejected",
      App: {
        path: "",
        screens: {
          MainTabs: {
            screens: {
              Home: "dashboard",
              Work: "daily-activity",
              Reports: "weekly-reports",
              Resources: "skills-hub",
              Profile: "profile",
            },
          },
          NotificationsInbox: "notifications",
          MySubmissions: "my-submissions",
          SponsorDashboard: "sponsor-dashboard",
          SubmissionsReview: "submissions",
          GroupTodosReports: "group-todos-reports",
          Teams: "teams",
          TeamMembers: "teams/members",
          TeamMemberDetail: "teams/member/:userId",
          AdminHub: "admin-dashboard",
          AdminSkills: "admin-skills",
          Suggestions: "suggestions",
        },
      },
    },
  },
};
