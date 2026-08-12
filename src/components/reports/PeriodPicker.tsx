import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";

type Props = {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
};

export function PeriodPicker({ options, value, onChange }: Props) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active ? styles.chipOn : null]}
          >
            <Text style={[styles.chipText, active ? styles.chipTextOn : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    row: { gap: 8, paddingVertical: 4 },
    chip: {
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: tokens.colors.surface,
    },
    chipOn: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
    chipText: { fontSize: 12, fontWeight: "700", color: tokens.colors.mutedForeground },
    chipTextOn: { color: tokens.colors.primaryForeground },
  });
