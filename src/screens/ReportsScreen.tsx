import { useCallback, useState } from "react";
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import type { AppTabParamList } from "../navigation/AppTabs";
import { useAppTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useMainAppNavigation } from "../hooks/useMainAppNavigation";
import { useTabBarContentPaddingBottom } from "../hooks/useTabBarContentPaddingBottom";
import { WeeklyReportScreen } from "./WeeklyReportScreen";
import { MonthlyGoalsScreen } from "./MonthlyGoalsScreen";

type ReportsMode = "menu" | "weekly" | "monthly";

type ReportsNav = BottomTabNavigationProp<AppTabParamList, "Reports">;
type ReportsRoute = RouteProp<AppTabParamList, "Reports">;

function modeFromTab(tab: "weekly" | "monthly" | undefined): ReportsMode {
  if (tab === "weekly") return "weekly";
  if (tab === "monthly") return "monthly";
  return "menu";
}

export function ReportsScreen() {
  const { tokens, themeName } = useAppTheme();
  const styles = getStyles(tokens);
  const insets = useSafeAreaInsets();
  const tabBarClearance = useTabBarContentPaddingBottom();
  const isCrimson = themeName === "crimson";
  const { isAdmin, isTrainer, isPro } = useAuth();
  const stackNav = useMainAppNavigation();
  const navigation = useNavigation<ReportsNav>();
  const route = useRoute<ReportsRoute>();
  const [mode, setMode] = useState<ReportsMode>(() => modeFromTab(route.params?.tab));

  useFocusEffect(
    useCallback(() => {
      const tab = route.params?.tab;
      if (tab === "weekly" || tab === "monthly") {
        setMode(tab);
        navigation.setParams({ tab: undefined });
      }
    }, [route.params?.tab, navigation]),
  );

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

  const subHeaderPad = { paddingTop: Math.max(insets.top, 10), paddingBottom: 10 };

  if (mode === "weekly") {
    return (
      <View style={styles.fullScreen}>
        <View style={[styles.subHeader, subHeaderPad]}>
          <Pressable onPress={() => setMode("menu")} style={styles.backIconBtn} accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.subHeaderTitle}>Weekly Report</Text>
          <View style={styles.subHeaderSpacer} />
        </View>
        <WeeklyReportScreen />
      </View>
    );
  }

  if (mode === "monthly") {
    return (
      <View style={styles.fullScreen}>
        <View style={[styles.subHeader, subHeaderPad]}>
          <Pressable onPress={() => setMode("menu")} style={styles.backIconBtn} accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.subHeaderTitle}>Monthly Goals</Text>
          <View style={styles.subHeaderSpacer} />
        </View>
        <MonthlyGoalsScreen />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeRoot} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scrollOuter}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarClearance }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroBlock}>
          <Text style={styles.title}>Reports Hub</Text>
          <Text style={styles.subtitle}>Review your week and track monthly targets.</Text>
        </View>

        <View style={styles.switcherWrap}>
          <Pressable
            onPress={() => setMode("weekly")}
            style={[styles.switchBtn, styles.switchBtnHalf, isCrimson ? styles.switchBtnCrimson : null]}
            accessibilityRole="button"
          >
            <Text style={[styles.switchTitle, isCrimson ? styles.switchTitleCrimson : null]}>Weekly Report</Text>
            <Text style={[styles.switchSub, isCrimson ? styles.switchSubCrimson : null]}>Summary & reflection</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("monthly")}
            style={[styles.switchBtn, styles.switchBtnHalf, isCrimson ? styles.switchBtnCrimson : null]}
            accessibilityRole="button"
          >
            <Text style={[styles.switchTitle, isCrimson ? styles.switchTitleCrimson : null]}>Monthly Goals</Text>
            <Text style={[styles.switchSub, isCrimson ? styles.switchSubCrimson : null]}>Targets & progress</Text>
          </Pressable>
        </View>

        {isAdmin || isTrainer || isPro ? (
          <Pressable
            onPress={() => stackNav.navigate("GroupTodosReports")}
            style={[styles.switchBtn, styles.groupCardFull, isCrimson ? styles.switchBtnCrimson : null]}
            accessibilityRole="button"
          >
            <Text style={[styles.switchTitle, isCrimson ? styles.switchTitleCrimson : null]}>Group Todo & Reports</Text>
            <Text style={[styles.switchSub, isCrimson ? styles.switchSubCrimson : null]}>
              Morning plan + night report visibility
            </Text>
          </Pressable>
        ) : null}

        <Text style={styles.helperText}>Tap a card above to open that report.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  scrollOuter: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 4,
  },
  heroBlock: {
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  subHeader: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    alignItems: "center",
    justifyContent: "center",
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
  subHeaderSpacer: {
    width: 36,
    height: 36,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: tokens.colors.foreground,
    textAlign: "center",
  },
  subtitle: {
    color: tokens.colors.mutedForeground,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 340,
  },
  switcherWrap: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    alignItems: "stretch",
  },
  groupCardFull: {
    alignSelf: "stretch",
    marginBottom: 10,
    minHeight: 0,
  },
  /** Only the two top row tiles share width; full-width cards must NOT use flex:1 or they fill the screen. */
  switchBtnHalf: {
    flex: 1,
  },
  switchBtn: {
    minHeight: 88,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  switchBtnCrimson: {
    backgroundColor: tokens.colors.card,
    borderColor: tokens.colors.primary,
    borderLeftWidth: 3,
  },
  switchTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: tokens.colors.primaryForeground,
    textAlign: "center",
  },
  switchSub: {
    marginTop: 2,
    fontSize: 12,
    color: tokens.colors.primaryForeground,
    textAlign: "center",
  },
  switchTitleCrimson: {
    color: tokens.colors.foreground,
  },
  switchSubCrimson: {
    color: tokens.colors.primary,
  },
  helperText: {
    marginTop: 14,
    textAlign: "center",
    color: tokens.colors.mutedForeground,
    fontSize: 13,
    paddingHorizontal: 8,
  },
  });
