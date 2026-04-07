import { useCallback, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import type { AppTabParamList } from "../navigation/AppTabs";
import { useAppTheme } from "../contexts/ThemeContext";
import { SkillsHubScreen } from "./SkillsHubScreen";
import { OfficeRulesScreen } from "./OfficeRulesScreen";
import { TimetableScreen } from "./TimetableScreen";
import { ProRequirementsScreen } from "./ProRequirementsScreen";

type ResourcesMode = "menu" | "skills" | "office" | "timetable" | "pro";

type ResourcesNav = BottomTabNavigationProp<AppTabParamList, "Resources">;
type ResourcesRoute = RouteProp<AppTabParamList, "Resources">;

function modeFromSection(s: "skills" | "office" | "timetable" | "pro" | undefined): ResourcesMode {
  if (s === "skills") return "skills";
  if (s === "office") return "office";
  if (s === "timetable") return "timetable";
  if (s === "pro") return "pro";
  return "menu";
}

const HUB_ITEMS: {
  mode: Exclude<ResourcesMode, "menu">;
  title: string;
  subtitle: string;
  symbol: string;
}[] = [
  { mode: "skills", title: "Skills Hub", subtitle: "Training skills & PDFs", symbol: "📖" },
  { mode: "office", title: "Office Rules", subtitle: "Guidelines for everyone", symbol: "📄" },
  { mode: "timetable", title: "Timetable", subtitle: "Daily office schedule", symbol: "📅" },
  { mode: "pro", title: "Pro Requirements", subtitle: "Path to Pro membership", symbol: "🎯" },
];

const SUBHEAD_TITLES: Record<Exclude<ResourcesMode, "menu">, string> = {
  skills: "Skills Hub",
  office: "Office Rules",
  timetable: "Daily Timetable",
  pro: "Pro Requirements",
};

export function ResourcesScreen() {
  const { tokens, themeName } = useAppTheme();
  const styles = getStyles(tokens);
  const isCrimson = themeName === "crimson";
  const navigation = useNavigation<ResourcesNav>();
  const route = useRoute<ResourcesRoute>();
  const [mode, setMode] = useState<ResourcesMode>(() => modeFromSection(route.params?.section));

  useFocusEffect(
    useCallback(() => {
      const s = route.params?.section;
      if (s === "skills" || s === "office" || s === "timetable" || s === "pro") {
        setMode(s);
        navigation.setParams({ section: undefined });
      }
    }, [route.params?.section, navigation]),
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

  if (mode === "skills") {
    return (
      <View style={styles.fullScreen}>
        <View style={[styles.subHeader, styles.subHeaderPanel]}>
          <Pressable onPress={() => setMode("menu")} style={styles.backIconBtn} accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.subHeaderTitle}>{SUBHEAD_TITLES.skills}</Text>
          <View style={styles.subHeaderSpacer} />
        </View>
        <SkillsHubScreen />
      </View>
    );
  }

  if (mode === "office") {
    return (
      <View style={styles.fullScreen}>
        <View style={[styles.subHeader, styles.subHeaderPanel]}>
          <Pressable onPress={() => setMode("menu")} style={styles.backIconBtn} accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.subHeaderTitle}>{SUBHEAD_TITLES.office}</Text>
          <View style={styles.subHeaderSpacer} />
        </View>
        <OfficeRulesScreen />
      </View>
    );
  }

  if (mode === "timetable") {
    return (
      <View style={styles.fullScreen}>
        <View style={[styles.subHeader, styles.subHeaderPanel]}>
          <Pressable onPress={() => setMode("menu")} style={styles.backIconBtn} accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.subHeaderTitle}>{SUBHEAD_TITLES.timetable}</Text>
          <View style={styles.subHeaderSpacer} />
        </View>
        <TimetableScreen />
      </View>
    );
  }

  if (mode === "pro") {
    return (
      <View style={styles.fullScreen}>
        <View style={[styles.subHeader, styles.subHeaderPanel]}>
          <Pressable onPress={() => setMode("menu")} style={styles.backIconBtn} accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.subHeaderTitle}>{SUBHEAD_TITLES.pro}</Text>
          <View style={styles.subHeaderSpacer} />
        </View>
        <ProRequirementsScreen />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resources Hub</Text>
      <Text style={styles.subtitle}>Skills, rules, schedule, and Pro criteria — same sources as the website.</Text>

      <View style={styles.grid}>
        {HUB_ITEMS.map((item) => (
          <Pressable
            key={item.mode}
            onPress={() => setMode(item.mode)}
            style={[styles.hubCard, isCrimson ? styles.hubCardCrimson : null]}
            accessibilityRole="button"
            accessibilityLabel={item.title}
          >
            <Text style={styles.hubSymbol}>{item.symbol}</Text>
            <View style={styles.hubTextCol}>
              <Text style={[styles.hubTitle, isCrimson ? styles.hubTitleCrimson : null]}>{item.title}</Text>
              <Text style={[styles.hubSub, isCrimson ? styles.hubSubCrimson : null]}>{item.subtitle}</Text>
            </View>
            <Text style={[styles.hubChevron, isCrimson ? styles.hubChevronCrimson : null]}>→</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.helperText}>Tap a card to open that resource. Use back to return here.</Text>
    </View>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
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
  subHeaderPanel: {
    paddingTop: 32,
    paddingBottom: 10,
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
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    color: tokens.colors.mutedForeground,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  grid: {
    gap: 10,
    marginBottom: 14,
  },
  hubCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  hubCardCrimson: {
    backgroundColor: tokens.colors.card,
    borderColor: tokens.colors.primary,
    borderLeftWidth: 3,
  },
  hubSymbol: {
    fontSize: 28,
  },
  hubTextCol: {
    flex: 1,
    gap: 2,
  },
  hubTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: tokens.colors.primaryForeground,
  },
  hubSub: {
    fontSize: 12,
    color: tokens.colors.primaryForeground,
    opacity: 0.95,
  },
  hubTitleCrimson: {
    color: tokens.colors.foreground,
  },
  hubSubCrimson: {
    color: tokens.colors.mutedForeground,
  },
  hubChevron: {
    fontSize: 20,
    fontWeight: "700",
    color: tokens.colors.primaryForeground,
    opacity: 0.9,
  },
  hubChevronCrimson: {
    color: tokens.colors.primary,
  },
  helperText: {
    marginTop: 6,
    textAlign: "center",
    color: tokens.colors.mutedForeground,
    fontSize: 13,
  },
  });
