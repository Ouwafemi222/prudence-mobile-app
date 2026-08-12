import { Share } from "react-native";

export async function copyOrShareText(label: string, value: string) {
  try {
    const Clipboard = require("expo-clipboard") as { setStringAsync?: (v: string) => Promise<void> };
    if (Clipboard.setStringAsync) {
      await Clipboard.setStringAsync(value);
      return "copied";
    }
  } catch {
    // fall through
  }
  await Share.share({ message: `${label}\n${value}`, title: label });
  return "shared";
}
