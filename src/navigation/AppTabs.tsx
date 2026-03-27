import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DashboardScreen } from "../screens/DashboardScreen";
import { WorkScreen } from "../screens/WorkScreen";
import { ReportsScreen } from "../screens/ReportsScreen";
import { ResourcesScreen } from "../screens/ResourcesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { tokens } from "../theme/tokens";

export type AppTabParamList = {
  Home: undefined;
  Work: undefined;
  Reports: undefined;
  Resources: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: tokens.colors.card },
        tabBarActiveTintColor: tokens.colors.primary,
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: "Home" }} />
      <Tab.Screen name="Work" component={WorkScreen} options={{ title: "Work" }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ title: "Reports" }} />
      <Tab.Screen name="Resources" component={ResourcesScreen} options={{ title: "Resources" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

