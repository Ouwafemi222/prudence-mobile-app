import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useAppTheme } from "../contexts/ThemeContext";
import { AuthScreen } from "../screens/AuthScreen";
import { WaitingApprovalScreen } from "../screens/WaitingApprovalScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { MainAppNavigator } from "./MainAppNavigator";

export type RootStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  WaitingApproval: undefined;
  App: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, profile, loading } = useAuth();
  const { tokens } = useAppTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: tokens.colors.background }}>
        <ActivityIndicator color={tokens.colors.primary} />
      </View>
    );
  }

  const showAuthFlow = !user;
  const waitingApproval = Boolean(user && profile && profile.approval_status !== "approved");

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: tokens.colors.background,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: tokens.colors.border,
        } as object,
        headerTintColor: tokens.colors.primary,
        headerTitleStyle: { fontWeight: "800", color: tokens.colors.foreground },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: tokens.colors.background },
      }}
    >
      {showAuthFlow ? (
        <>
          <Stack.Screen
            name="Welcome"
            options={{ title: "Prudence Path" }}
            children={({ navigation }) => <WelcomeScreen onGetStarted={() => navigation.navigate("Auth")} />}
          />
          <Stack.Screen name="Auth" component={AuthScreen} options={{ title: "Sign In" }} />
        </>
      ) : waitingApproval ? (
        <Stack.Screen name="WaitingApproval" component={WaitingApprovalScreen} options={{ title: "Account Status" }} />
      ) : (
        <Stack.Screen name="App" component={MainAppNavigator} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
