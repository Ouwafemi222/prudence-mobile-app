import type { ReactNode } from "react";
import { Component } from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "../theme/tokens";

class ErrorBoundaryImpl extends Component<
  { children: ReactNode; fallbackTitle?: string },
  { hasError: boolean; errorText: string }
> {
  state = { hasError: false, errorText: "" };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      errorText: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("App crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>{this.props.fallbackTitle ?? "Something went wrong"}</Text>
          <Text style={styles.errorText} numberOfLines={8}>
            {this.state.errorText}
          </Text>
          <Text style={styles.subtitle}>Try restarting Expo.</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children, fallbackTitle }: { children: ReactNode; fallbackTitle?: string }) {
  return <ErrorBoundaryImpl fallbackTitle={fallbackTitle}>{children}</ErrorBoundaryImpl>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: tokens.colors.background,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: tokens.colors.foreground,
    textAlign: "center",
  },
  errorText: {
    color: tokens.colors.destructive,
    fontSize: 13,
    textAlign: "center",
  },
  subtitle: {
    color: tokens.colors.mutedForeground,
    fontSize: 13,
    textAlign: "center",
  },
});

