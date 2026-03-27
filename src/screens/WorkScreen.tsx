import { useCallback, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Button } from "../components/ui/Button";
import { DailyTodoScreen } from "./DailyTodoScreen";
import { tokens } from "../theme/tokens";
import { DailyActivityScreen } from "./DailyActivityScreen";

type WorkMode = "menu" | "todo" | "activity";

export function WorkScreen() {
  const [mode, setMode] = useState<WorkMode>("menu");

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (mode !== "menu") {
          setMode("menu");
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [mode]),
  );

  if (mode === "todo") {
    return (
      <View style={styles.fullScreen}>
        <View style={[styles.subHeader, styles.subHeaderTodo]}>
          <Pressable onPress={() => setMode("menu")} style={[styles.backIconBtn, styles.backIconBtnTodo]} accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={[styles.subHeaderTitle, styles.subHeaderTitleTodo]}>Morning Plan</Text>
          <View style={styles.subHeaderSpacer} />
        </View>
        <DailyTodoScreen />
      </View>
    );
  }

  if (mode === "activity") {
    return (
      <View style={styles.fullScreen}>
        <View style={[styles.subHeader, styles.subHeaderActivity]}>
          <Pressable onPress={() => setMode("menu")} style={styles.backIconBtn} accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.subHeaderTitle}>Daily Activity</Text>
          <View style={styles.subHeaderSpacer} />
        </View>
        <DailyActivityScreen />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Work Hub</Text>
      <Text style={styles.subtitle}>Plan first. Report after execution.</Text>

      <View style={styles.switcherWrap}>
        <Pressable
          onPress={() => setMode("todo")}
          style={styles.switchBtn}
          accessibilityRole="button"
        >
          <Text style={styles.switchTitle}>Morning Plan</Text>
          <Text style={styles.switchSub}>Daily Todo</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("activity")}
          style={styles.switchBtn}
          accessibilityRole="button"
        >
          <Text style={styles.switchTitle}>Daily Report</Text>
          <Text style={styles.switchSub}>Activity</Text>
        </Pressable>
      </View>

      <Text style={styles.helperText}>
        Tap a card above to continue directly.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    padding: 18,
    justifyContent: "center",
  },
  fullScreen: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  subHeader: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subHeaderTodo: {
    paddingTop: 32,
    paddingBottom: 10,
  },
  subHeaderActivity: {
    paddingTop: 32,
    paddingBottom: 10,
  },
  backIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backIconBtnTodo: {
    marginTop: 0,
  },
  backIcon: {
    fontSize: 22,
    lineHeight: 22,
    color: tokens.colors.foreground,
    fontWeight: "800",
  },
  subHeaderTitle: {
    fontSize: 16,
    color: tokens.colors.foreground,
    fontWeight: "800",
  },
  subHeaderTitleTodo: {
    fontSize: 17,
  },
  subHeaderSpacer: {
    width: 36,
    height: 36,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: tokens.colors.foreground,
    marginBottom: 10,
    textAlign: "center",
    fontFamily: "Georgia",
  },
  subtitle: {
    color: tokens.colors.mutedForeground,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 18,
    fontFamily: "Georgia",
  },
  switcherWrap: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  switchBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  switchTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: tokens.colors.primaryForeground,
    textAlign: "center",
    fontFamily: "Georgia",
  },
  switchSub: {
    marginTop: 2,
    fontSize: 12,
    color: tokens.colors.primaryForeground,
    textAlign: "center",
    fontFamily: "Georgia",
  },
  helperText: {
    marginTop: 14,
    textAlign: "center",
    color: tokens.colors.mutedForeground,
    fontSize: 13,
    fontFamily: "Georgia",
  },
});

