import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BarChart3, BookOpen, Briefcase, Home, User } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FloatingBotButton } from "../components/FloatingBotButton";
import { DashboardScreen } from "../screens/DashboardScreen";
import { WorkScreen } from "../screens/WorkScreen";
import { ReportsScreen } from "../screens/ReportsScreen";
import { ResourcesScreen } from "../screens/ResourcesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { useAppTheme } from "../contexts/ThemeContext";

export type AppTabParamList = {
  Home: undefined;
  /** Deep-link from Home dashboard quick actions */
  Work: { openDailyReport?: boolean; openMorningPlan?: boolean } | undefined;
  /** Optional tab from dashboard quick actions */
  Reports: { tab?: "weekly" | "monthly" } | undefined;
  /** Deep-link from Home (e.g. Skills Hub quick action) */
  Resources: { section?: "skills" | "office" | "timetable" | "pro" } | undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

const ICON = 22;
const TAB_FLOAT_MARGIN_H = 18;
/** Gap from physical bottom edge; home indicator sits inside tab bar via paddingBottom */
const TAB_FLOAT_BOTTOM = 12;
const TAB_BAR_CORE_HEIGHT = 54;

export function AppTabs() {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_CORE_HEIGHT + insets.bottom;
  const styles = getStyles(tokens);

  return (
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [
          styles.tabBar,
          {
            position: "absolute",
            left: TAB_FLOAT_MARGIN_H,
            right: TAB_FLOAT_MARGIN_H,
            bottom: TAB_FLOAT_BOTTOM,
            height: tabBarHeight,
            paddingBottom: insets.bottom + 4,
            paddingTop: 6,
            borderTopWidth: 0,
            borderTopColor: "transparent",
          },
        ],
        tabBarActiveTintColor: tokens.colors.primary,
        tabBarInactiveTintColor: tokens.colors.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Home size={ICON} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tab.Screen
        name="Work"
        component={WorkScreen}
        options={{
          title: "Work",
          tabBarIcon: ({ color, focused }) => (
            <Briefcase size={ICON} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          title: "Reports",
          tabBarIcon: ({ color, focused }) => (
            <BarChart3 size={ICON} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tab.Screen
        name="Resources"
        component={ResourcesScreen}
        options={{
          title: "Learn",
          tabBarIcon: ({ color, focused }) => (
            <BookOpen size={ICON} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <User size={ICON} color={color} strokeWidth={focused ? 2.4 : 1.8} />
          ),
        }}
      />
    </Tab.Navigator>
    <FloatingBotButton />
    </View>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: tokens.colors.tabBar,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      paddingTop: 8,
      borderRadius: 26,
      marginHorizontal: 0,
      shadowColor: tokens.colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 6,
    },
    tabLabel: {
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
    tabItem: {
      paddingTop: 4,
    },
  });
