import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useAppTheme } from "../contexts/ThemeContext";
import { AuthScreen } from "../screens/AuthScreen";
import { WaitingApprovalScreen } from "../screens/WaitingApprovalScreen";
import { AccountRejectedScreen } from "../screens/AccountRejectedScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { MainAppNavigator } from "./MainAppNavigator";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, profile, loading, emailConfirmed, passwordRecovery, userDataLoading } = useAuth();
  const { tokens } = useAppTheme();

  if (loading || (user && emailConfirmed && !passwordRecovery && !profile && userDataLoading)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tokens.colors.background,
        }}
      >
        <ActivityIndicator color={tokens.colors.primary} />
      </View>
    );
  }

  const showAuthFlow = !user || !emailConfirmed || passwordRecovery;
  const rejected = Boolean(user && emailConfirmed && profile && profile.approval_status === "rejected");
  const waitingApproval = Boolean(
    user &&
      emailConfirmed &&
      !passwordRecovery &&
      (!profile || (profile.approval_status !== "approved" && !rejected)),
  );

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
        freezeOnBlur: true,
        animation: "slide_from_right",
        animationDuration: 220,
        contentStyle: { backgroundColor: tokens.colors.background },
      }}
    >
      {passwordRecovery ? (
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{ title: "Reset Password" }}
        />
      ) : showAuthFlow ? (
        <>
          <Stack.Screen
            name="Welcome"
            options={{ title: "THE PRUDENCE" }}
            children={({ navigation }) => (
              <WelcomeScreen onGetStarted={() => navigation.navigate("Auth")} />
            )}
          />
          <Stack.Screen name="Auth" component={AuthScreen} options={{ title: "Sign In" }} />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ title: "Reset Password" }}
          />
        </>
      ) : rejected ? (
        <Stack.Screen
          name="AccountRejected"
          component={AccountRejectedScreen}
          options={{ title: "Account Status" }}
        />
      ) : waitingApproval ? (
        <Stack.Screen
          name="WaitingApproval"
          component={WaitingApprovalScreen}
          options={{ title: "Account Status" }}
        />
      ) : (
        <Stack.Screen name="App" component={MainAppNavigator} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
