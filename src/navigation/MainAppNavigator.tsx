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
import { AdminHubScreen } from "../screens/AdminHubScreen";
import { AdminSkillsScreen } from "../screens/AdminSkillsScreen";
import { SuggestionsScreen } from "../screens/SuggestionsScreen";
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
      <Stack.Screen name="AdminHub" component={AdminHubScreen} options={{ title: "Admin" }} />
      <Stack.Screen name="AdminSkills" component={AdminSkillsScreen} options={{ title: "Manage Skills" }} />
      <Stack.Screen name="Suggestions" component={SuggestionsScreen} options={{ title: "Suggestions" }} />
    </Stack.Navigator>
  );
}
