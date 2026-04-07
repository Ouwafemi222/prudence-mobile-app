import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../contexts/ThemeContext";

type Props = {
  visible: boolean;
  url: string;
  title: string;
  onClose: () => void;
};

/**
 * PDF in-app: WebView (Expo Go + dev builds). Native `react-native-pdf` is avoided here because
 * it often crashes when the native module isn’t linked (`getConstants` null / missing default export).
 *
 * Android: Google’s embedded viewer (raw PDF URLs are unreliable in Android WebView).
 * iOS: WKWebView usually renders HTTPS PDFs directly.
 */
export function PdfViewerModal({ visible, url, title, onClose }: Props) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const trimmed = url.trim();
  const show = visible && trimmed.length > 0;

  const viewerUri = useMemo(() => {
    if (!trimmed) return "";
    if (Platform.OS === "android") {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(trimmed)}&embedded=true`;
    }
    return trimmed;
  }, [trimmed]);

  useEffect(() => {
    if (show) {
      setRetryNonce(0);
      setLoading(true);
      setError(null);
    }
  }, [show, trimmed]);

  const openExternal = useCallback(async () => {
    try {
      const ok = await Linking.canOpenURL(trimmed);
      if (ok) await Linking.openURL(trimmed);
      else setError("This device can’t open the PDF link.");
    } catch {
      setError("Could not open the PDF in the browser.");
    }
  }, [trimmed]);

  const handleClose = useCallback(() => {
    setLoading(true);
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal visible={show} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <View style={[styles.root, { paddingTop: insets.top, backgroundColor: tokens.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: tokens.colors.border }]}>
          <Pressable onPress={handleClose} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Close PDF">
            <Text style={[styles.headerBtnLabel, { color: tokens.colors.primary }]}>Close</Text>
          </Pressable>
          <Text style={[styles.title, { color: tokens.colors.foreground }]} numberOfLines={2}>
            {title}
          </Text>
          <Pressable onPress={openExternal} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Open PDF in browser">
            <Text style={[styles.headerBtnLabel, { color: tokens.colors.primary }]}>Open</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.centered}>
            <Text style={[styles.errTitle, { color: tokens.colors.foreground }]}>Couldn’t show PDF</Text>
            <Text style={[styles.errBody, { color: tokens.colors.mutedForeground }]}>{error}</Text>
            <Pressable
              style={[styles.retryBtn, { borderColor: tokens.colors.border, backgroundColor: tokens.colors.card }]}
              onPress={() => {
                setError(null);
                setLoading(true);
                setRetryNonce((n) => n + 1);
              }}
            >
              <Text style={{ color: tokens.colors.primary, fontWeight: "700" }}>Try again</Text>
            </Pressable>
            <Pressable style={styles.retryBtn} onPress={openExternal}>
              <Text style={{ color: tokens.colors.primary, fontWeight: "700" }}>Open in browser</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.webWrap}>
            <WebView
              key={`${viewerUri}-${retryNonce}`}
              source={{ uri: viewerUri }}
              style={styles.webview}
              onLoadStart={() => {
                setLoading(true);
                setError(null);
              }}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(
                  Platform.OS === "android"
                    ? "Preview failed. Try Open in the top-right, or check that the file is publicly reachable."
                    : "Preview failed. Try Open in the top-right.",
                );
              }}
              onHttpError={() => {
                setLoading(false);
                setError("The PDF server returned an error. Try Open in the browser.");
              }}
              javaScriptEnabled
              domStorageEnabled
              setSupportMultipleWindows={false}
              originWhitelist={["https://*", "http://*"]}
              mixedContentMode="compatibility"
              allowsInlineMediaPlayback
            />
            {loading ? (
              <View style={[styles.loadingOverlay, { backgroundColor: tokens.colors.overlay }]} pointerEvents="none">
                <ActivityIndicator size="large" color={tokens.colors.primary} />
                <Text style={styles.loadingHint}>Loading PDF…</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 10,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { paddingVertical: 10, paddingHorizontal: 10 },
  headerBtnLabel: { fontSize: 16, fontWeight: "700" },
  title: { flex: 1, fontSize: 15, fontWeight: "800", textAlign: "center" },
  webWrap: { flex: 1 },
  webview: { flex: 1, backgroundColor: "#00000012" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 14 },
  errTitle: { fontSize: 17, fontWeight: "800", textAlign: "center" },
  errBody: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingHint: { marginTop: 4, fontSize: 14, fontWeight: "600", color: "#F4F4F5" },
});
