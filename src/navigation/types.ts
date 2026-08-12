export type AuthScreenParams = {
  tab?: "signin" | "signup" | "forgot";
  office?: string;
  sponsor?: string;
  confirmed?: string;
};

export type RootStackParamList = {
  Welcome: undefined;
  Auth: AuthScreenParams | undefined;
  ResetPassword: { code?: string } | undefined;
  WaitingApproval: undefined;
  AccountRejected: undefined;
  App: undefined;
};

export type MainAppStackParamList = {
  MainTabs: undefined;
  MySubmissions: undefined;
  NotificationsInbox: undefined;
  SponsorDashboard: undefined;
  SubmissionsReview: undefined;
  GroupTodosReports: undefined;
  Teams: { focusUserId?: string } | undefined;
  TeamMembers: { groupId?: string; groupName?: string } | undefined;
  TeamMemberDetail: { userId: string; fullName?: string; weekStart?: string };
  ActivityReview: { activityId: string; fullName?: string };
  AdminHub: undefined;
  AdminSkills: undefined;
  Suggestions: undefined;
  TrainerGroupWeekly: undefined;
  AdminDashboard: undefined;
  AdminOffices: undefined;
  OfficeAdmin: undefined;
  AdminOfficeApplications: undefined;
  AdminMonthlyGoals: undefined;
  AssistantChat: undefined;
};
