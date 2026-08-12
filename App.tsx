import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { AppProviders } from "./src/providers/AppProviders";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { navigationRef } from "./src/navigation/navigationRef";
import { navigationLinking } from "./src/navigation/linking";
import { DeferredExpoStatusBar } from "./src/components/DeferredExpoStatusBar";
import { NotificationResponseBridge } from "./src/components/NotificationResponseBridge";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { useAppTheme } from "./src/contexts/ThemeContext";

function AppNavigation() {
  const { tokens } = useAppTheme();
  const base = tokens.isLight ? DefaultTheme : DarkTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: tokens.colors.primary,
      background: tokens.colors.background,
      card: tokens.colors.surface,
      text: tokens.colors.foreground,
      border: tokens.colors.border,
      notification: tokens.colors.primary,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} linking={navigationLinking as never}>
      <DeferredExpoStatusBar
        style={tokens.isLight ? "dark" : "light"}
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
      <ErrorBoundary fallbackTitle="THE PRUDENCE crashed">
        <AppNavigation />
      </ErrorBoundary>
    </AppProviders>
  );
}
