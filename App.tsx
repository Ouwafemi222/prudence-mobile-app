import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { Text, TextInput } from "react-native";
import { AppProviders } from "./src/providers/AppProviders";
import { tokens } from "./src/theme/tokens";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

// Apply Georgia as the default app font.
const TextAny = Text as any;
TextAny.defaultProps = TextAny.defaultProps || {};
TextAny.defaultProps.style = [TextAny.defaultProps.style, { fontFamily: "Georgia" }];

const TextInputAny = TextInput as any;
TextInputAny.defaultProps = TextInputAny.defaultProps || {};
TextInputAny.defaultProps.style = [TextInputAny.defaultProps.style, { fontFamily: "Georgia" }];

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: tokens.colors.background,
    card: tokens.colors.card,
    text: tokens.colors.foreground,
    primary: tokens.colors.primary,
    border: tokens.colors.border,
  },
};

export default function App() {
  return (
    <AppProviders>
      <ErrorBoundary fallbackTitle="Prudence Path crashed">
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </ErrorBoundary>
    </AppProviders>
  );
}
