import { Image, StyleSheet, type ImageStyle, type StyleProp } from "react-native";

const logoSource = require("../../../assets/icon.png");

export function Logo({ size = 72, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={logoSource}
      accessibilityLabel="THE PRUDENCE"
      style={[styles.image, { width: size, height: size, borderRadius: size * 0.22 }, style]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: "contain",
  },
});
