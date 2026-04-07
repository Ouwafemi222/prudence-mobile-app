import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { AppProviders } from "./src/providers/AppProviders";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { navigationRef } from "./src/navigation/navigationRef";
import { DeferredExpoStatusBar } from "./src/components/DeferredExpoStatusBar";
import { NotificationResponseBridge } from "./src/components/NotificationResponseBridge";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { useAppTheme } from "./src/contexts/ThemeContext";

function AppNavigation() {
  const { tokens, themeName } = useAppTheme();
  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: tokens.colors.primary,
      background: tokens.colors.background,
      card: tokens.colors.card,
      text: tokens.colors.foreground,
      border: tokens.colors.border,
      notification: tokens.colors.primary,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <DeferredExpoStatusBar
        style={themeName === "crimson" ? "dark" : "light"}
        backgroundColor={tokens.colors.background}
      />
      <NotificationResponseBridge />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProviders>
      <ErrorBoundary fallbackTitle="Prudence Path crashed">
        <AppNavigation />
      </ErrorBoundary>
    </AppProviders>
  );
}
