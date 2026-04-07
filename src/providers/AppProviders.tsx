import { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { PushNotificationBootstrap } from "../components/PushNotificationBootstrap";
import { SuggestionOutboxSync } from "../components/SuggestionOutboxSync";
import { SubmissionRemindersBootstrap } from "../components/SubmissionRemindersBootstrap";

const queryClient = new QueryClient();

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <PushNotificationBootstrap />
              <SuggestionOutboxSync />
              <SubmissionRemindersBootstrap />
              {children}
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
