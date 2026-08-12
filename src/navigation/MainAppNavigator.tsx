import { StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppTabs } from "./AppTabs";
import type { MainAppStackParamList } from "./types";
import { MySubmissionsScreen } from "../screens/MySubmissionsScreen";
import { NotificationsInboxScreen } from "../screens/NotificationsInboxScreen";
import { SponsorDashboardScreen } from "../screens/SponsorDashboardScreen";
import { SubmissionsReviewScreen } from "../screens/SubmissionsReviewScreen";
import { GroupTodosReportsScreen } from "../screens/GroupTodosReportsScreen";
import { TeamsScreen } from "../screens/TeamsScreen";
import { TeamMembersScreen } from "../screens/TeamMembersScreen";
import { TeamMemberDetailScreen } from "../screens/TeamMemberDetailScreen";
import { ActivityReviewScreen } from "../screens/ActivityReviewScreen";
import { AdminHubScreen } from "../screens/AdminHubScreen";
import { AdminSkillsScreen } from "../screens/AdminSkillsScreen";
import { SuggestionsScreen } from "../screens/SuggestionsScreen";
import { TrainerGroupWeeklyScreen } from "../screens/TrainerGroupWeeklyScreen";
import { AdminDashboardScreen } from "../screens/AdminDashboardScreen";
import { AdminOfficesScreen } from "../screens/AdminOfficesScreen";
import { OfficeAdminScreen } from "../screens/OfficeAdminScreen";
import { AdminOfficeApplicationsScreen } from "../screens/AdminOfficeApplicationsScreen";
import { AdminMonthlyGoalsScreen } from "../screens/AdminMonthlyGoalsScreen";
import { AssistantChatScreen } from "../screens/AssistantChatScreen";
import { useAppTheme } from "../contexts/ThemeContext";

const Stack = createNativeStackNavigator<MainAppStackParamList>();

export function MainAppNavigator() {
  const { tokens } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: tokens.colors.background,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: tokens.colors.border,
        } as object,
        headerTintColor: tokens.colors.primary,
        headerTitleStyle: { fontWeight: "800", color: tokens.colors.foreground, fontSize: 17 },
        headerShadowVisible: false,
        freezeOnBlur: true,
        animation: "slide_from_right",
        animationDuration: 220,
        contentStyle: { backgroundColor: tokens.colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={AppTabs} options={{ headerShown: false }} />
      <Stack.Screen name="MySubmissions" component={MySubmissionsScreen} options={{ title: "My Submissions" }} />
      <Stack.Screen name="NotificationsInbox" component={NotificationsInboxScreen} options={{ title: "Notifications" }} />
      <Stack.Screen name="SponsorDashboard" component={SponsorDashboardScreen} options={{ title: "Sponsor Dashboard" }} />
      <Stack.Screen name="SubmissionsReview" component={SubmissionsReviewScreen} options={{ title: "Submissions" }} />
      <Stack.Screen name="GroupTodosReports" component={GroupTodosReportsScreen} options={{ title: "Group Todos & Reports" }} />
      <Stack.Screen name="Teams" component={TeamsScreen} options={{ title: "Teams" }} />
      <Stack.Screen name="TeamMembers" component={TeamMembersScreen} options={{ title: "Team Members" }} />
      <Stack.Screen
        name="TeamMemberDetail"
        component={TeamMemberDetailScreen}
        options={({ route }) => ({ title: route.params.fullName || "Member details" })}
      />
      <Stack.Screen
        name="ActivityReview"
        component={ActivityReviewScreen}
        options={({ route }) => ({ title: route.params?.fullName ? `${route.params.fullName} · Report` : "Night report" })}
      />
      <Stack.Screen name="AdminHub" component={AdminHubScreen} options={{ title: "Admin" }} />
      <Stack.Screen name="AdminSkills" component={AdminSkillsScreen} options={{ title: "Manage Skills" }} />
      <Stack.Screen name="Suggestions" component={SuggestionsScreen} options={{ title: "Suggestions" }} />
      <Stack.Screen name="TrainerGroupWeekly" component={TrainerGroupWeeklyScreen} options={{ title: "Group Weekly" }} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: "Admin Dashboard" }} />
      <Stack.Screen name="AdminOffices" component={AdminOfficesScreen} options={{ title: "Offices" }} />
      <Stack.Screen name="OfficeAdmin" component={OfficeAdminScreen} options={{ title: "Office Admin" }} />
      <Stack.Screen name="AdminOfficeApplications" component={AdminOfficeApplicationsScreen} options={{ title: "Office Applications" }} />
      <Stack.Screen name="AdminMonthlyGoals" component={AdminMonthlyGoalsScreen} options={{ title: "Admin Monthly Goals" }} />
      <Stack.Screen name="AssistantChat" component={AssistantChatScreen} options={{ title: "Ask Prudence" }} />
    </Stack.Navigator>
  );
}
