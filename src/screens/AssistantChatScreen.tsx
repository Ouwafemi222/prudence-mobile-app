import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bot } from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext";
import { useAppTheme } from "../contexts/ThemeContext";
import { useKeyboardBottomInset } from "../hooks/useKeyboardBottomInset";
import { answerMemberQuestion, type ChatMessage } from "../lib/memberAssistant";
import { Button } from "../components/ui/Button";

const STARTERS = [
  "When is the daily report due?",
  "How do tags work?",
  "How do I set monthly goals?",
  "What if my account is pending?",
];

export function AssistantChatScreen() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => getStyles(tokens), [tokens]);
  const { profile, officeId } = useAuth();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardBottomInset();
  const headerHeight = insets.top + 56;
  const firstName = (profile?.full_name || profile?.username || "there").split(" ")[0];
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: `Hi ${firstName} — ask me anything about THE PRUDENCE. Morning plans, night reports, tags, goals, skills, or approvals.`,
    },
  ]);

  const composerPad = keyboardHeight > 0 ? 10 : Math.max(insets.bottom, 10);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setBusy(true);
    try {
      const reply = await answerMemberQuestion(question, { officeId, name: firstName });
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: "I could not answer just now. Please try again." },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
    >
      <View style={styles.identity}>
        <View style={styles.botBadge}>
          <Bot size={18} color={tokens.colors.primaryForeground} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.identityTitle}>Prudence bot</Text>
          <Text style={styles.identitySub}>Ask about plans, tags, goals, and office rules</Text>
        </View>
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          <View style={styles.starters}>
            {STARTERS.map((item) => (
              <Pressable key={item} onPress={() => void send(item)} style={styles.chip}>
                <Text style={styles.chipText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.bubbleUser : styles.bubbleBot]}>
            <Text style={item.role === "user" ? styles.userText : styles.botText}>{item.text}</Text>
          </View>
        )}
      />
      {busy ? <ActivityIndicator color={tokens.colors.primary} style={{ marginBottom: 8 }} /> : null}
      <View style={[styles.composer, { paddingBottom: composerPad, marginBottom: Platform.OS === "android" ? keyboardHeight : 0 }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask a question…"
          placeholderTextColor={tokens.colors.muted}
          style={styles.input}
          multiline
          blurOnSubmit={false}
          onSubmitEditing={() => void send(input)}
        />
        <Button title="Send" onPress={() => void send(input)} disabled={busy || !input.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.colors.background },
    identity: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: tokens.colors.border,
    },
    botBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: tokens.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    identityTitle: { fontSize: 15, fontWeight: "800", color: tokens.colors.foreground },
    identitySub: { fontSize: 12, color: tokens.colors.mutedForeground, marginTop: 1 },
    list: { padding: 16, paddingBottom: 12, gap: 10, flexGrow: 1 },
    starters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
    chip: {
      borderWidth: 1,
      borderColor: tokens.colors.border,
      backgroundColor: tokens.colors.card,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipText: { fontSize: 12, fontWeight: "700", color: tokens.colors.foreground },
    bubble: { maxWidth: "88%", padding: 12, borderRadius: 16 },
    bubbleUser: { alignSelf: "flex-end", backgroundColor: tokens.colors.primary },
    bubbleBot: { alignSelf: "flex-start", backgroundColor: tokens.colors.card, borderWidth: 1, borderColor: tokens.colors.border },
    userText: { color: tokens.colors.primaryForeground, fontSize: 15, lineHeight: 21 },
    botText: { color: tokens.colors.foreground, fontSize: 15, lineHeight: 21 },
    composer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: tokens.colors.border,
      backgroundColor: tokens.colors.background,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: tokens.colors.foreground,
      backgroundColor: tokens.colors.surface,
    },
  });
