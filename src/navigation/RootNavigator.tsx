import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { AuthScreen } from "../screens/AuthScreen";
import { WaitingApprovalScreen } from "../screens/WaitingApprovalScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { tokens } from "../theme/tokens";
import { AppTabs } from "./AppTabs";

export type RootStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  WaitingApproval: undefined;
  App: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, profile, loading } = useAuth();

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
        headerStyle: { backgroundColor: tokens.colors.card },
        headerTintColor: tokens.colors.foreground,
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
        <Stack.Screen name="App" component={AppTabs} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
