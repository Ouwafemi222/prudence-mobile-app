import { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { FontBootstrap } from "../components/FontBootstrap";
import { PushNotificationBootstrap } from "../components/PushNotificationBootstrap";
import { SuggestionOutboxSync } from "../components/SuggestionOutboxSync";
import { SubmissionRemindersBootstrap } from "../components/SubmissionRemindersBootstrap";
import { InAppNotificationPresenter } from "../components/InAppNotificationPresenter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <FontBootstrap>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <PushNotificationBootstrap />
              <InAppNotificationPresenter />
              <SuggestionOutboxSync />
              <SubmissionRemindersBootstrap />
              {children}
            </AuthProvider>
          </QueryClientProvider>
          </FontBootstrap>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
