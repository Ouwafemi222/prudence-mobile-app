import { Pressable, StyleSheet, View } from "react-native";
import { Bot } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../contexts/ThemeContext";
import { useMainAppNavigation } from "../hooks/useMainAppNavigation";
import { useKeyboardBottomInset } from "../hooks/useKeyboardBottomInset";

const TAB_FLOAT_BOTTOM = 12;
const TAB_BAR_CORE_HEIGHT = 54;
const FAB_SIZE = 58;

export function FloatingBotButton() {
  const { tokens } = useAppTheme();
  const nav = useMainAppNavigation();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardBottomInset();
  if (keyboard > 80) return null;

  const bottom = TAB_FLOAT_BOTTOM + TAB_BAR_CORE_HEIGHT + insets.bottom + 16;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask Prudence"
        onPress={() => nav.navigate("AssistantChat")}
        style={({ pressed }) => [
          styles.fab,
          {
            bottom,
            backgroundColor: tokens.colors.primary,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
      >
        <Bot size={26} color={tokens.colors.primaryForeground} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 18,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5B52EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
});
