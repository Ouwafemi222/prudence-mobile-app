import { useCallback, useState } from "react";
import { useNetInfo } from "@react-native-community/netinfo";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { getLocalUriAsUploadBody } from "../lib/localFileForUpload";
import {
  enqueueSuggestion,
  flushSuggestionOutbox,
  isDefinitelyOffline,
  isLikelyNetworkFailure,
  loadOutbox,
  removeOutboxItem,
  type OutboxSuggestion,
} from "../lib/suggestionOutbox";
import { tokens } from "../theme/tokens";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Textarea";
import { KeyboardSafeView } from "../components/ui/KeyboardSafe";
import { FAST_LIST } from "../lib/listPerf";
import { showAndroidToast } from "../lib/androidToast";

type Row = {
  id: string;
  message: string;
  created_at: string;
  user_id: string | null;
  image_paths: string[] | null;
};

function toast(msg: string) {
  if (Platform.OS === "android") showAndroidToast(msg);
}

function getPublicAttachmentUrl(path: string): string {
  return supabase.storage.from("suggestion_attachments").getPublicUrl(path).data.publicUrl;
}

export function SuggestionsScreen() {
  const { user, isSuperAdmin } = useAuth();
  const netInfo = useNetInfo();
  const [message, setMessage] = useState("");
  const [pickedImages, setPickedImages] = useState<{ uri: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Row[]>([]);
  const [outbox, setOutbox] = useState<OutboxSuggestion[]>([]);

  const refreshOutbox = useCallback(async () => {
    setOutbox(await loadOutbox());
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("suggestions")
        .select("id, message, created_at, user_id, image_paths")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!isSuperAdmin) query = query.eq("user_id", user.id);
      const { data, error } = await query;
      if (error) throw error;
      setList((data || []) as Row[]);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void (async () => {
        await flushSuggestionOutbox(user.id);
        setOutbox(await loadOutbox());
        await load();
      })();
    }, [user?.id, load]),
  );

  const uploadAttachments = async (uris: string[]): Promise<string[]> => {
    const uploaded: string[] = [];
    const folder = user?.id || "anon";
    for (let i = 0; i < uris.length; i += 1) {
      const uri = uris[i];
      const { body, contentType } = await getLocalUriAsUploadBody(uri);
      const ext = uri.match(/\.(\w+)(\?|$)/)?.[1]?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const fileName = `${folder}/${Date.now()}_${i}.${ext || "jpg"}`;
      const { error } = await supabase.storage.from("suggestion_attachments").upload(fileName, body, {
        contentType,
        upsert: false,
      });
      if (error) throw error;
      uploaded.push(fileName);
    }
    return uploaded;
  };

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast("Allow photo access to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;
    setPickedImages((prev) => [...prev, ...result.assets.map((a) => ({ uri: a.uri }))]);
  };

  const removePickedAt = (index: number) => {
    setPickedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    const text = message.trim();
    if (!text && pickedImages.length === 0) return;
    const imageUris = pickedImages.map((p) => p.uri);
    setSubmitting(true);
    try {
      if (await isDefinitelyOffline()) {
        await enqueueSuggestion(text, imageUris);
        setMessage("");
        setPickedImages([]);
        await refreshOutbox();
        toast("Saved offline — will send when you have data or Wi‑Fi.");
        return;
      }

      let imagePaths: string[] = [];
      if (pickedImages.length > 0) {
        try {
          imagePaths = await uploadAttachments(imageUris);
        } catch {
          toast("Image upload failed — sending text only.");
          imagePaths = [];
        }
      }
      try {
        const { error } = await supabase.from("suggestions").insert({
          message: text || "(image-only suggestion)",
          image_paths: imagePaths.length ? imagePaths : null,
        });
        if (error) throw error;
      } catch (e: unknown) {
        if (isLikelyNetworkFailure(e)) {
          await enqueueSuggestion(text, imageUris);
          setMessage("");
          setPickedImages([]);
          await refreshOutbox();
          toast("Connection issue — message saved; will send when you’re back online.");
          return;
        }
        throw e;
      }
      setMessage("");
      setPickedImages([]);
      toast("Suggestion sent");
      await load();
      await refreshOutbox();
    } catch {
      toast("Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  const appearsOffline = netInfo.isConnected === false;

  const header = (
    <View style={styles.headerBlock}>
      <Text style={styles.intro}>
        Same suggestion box as the website. Super admins see the full list below. If you have no data, your message is
        saved on the device and sends automatically when you reconnect.
      </Text>
      {appearsOffline ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>You appear offline — messages you send are queued until you have a connection.</Text>
        </View>
      ) : null}
      {outbox.length > 0 ? (
        <Card style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>Waiting to send ({outbox.length})</Text>
          <Text style={styles.pendingSub}>These will upload as soon as you have internet.</Text>
          {outbox.map((o) => (
            <View key={o.id} style={styles.pendingRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.pendingBody} numberOfLines={4}>
                  {o.message}
                </Text>
                {o.imageUris.length > 0 ? (
                  <Text style={styles.pendingMeta}>{o.imageUris.length} image(s) attached</Text>
                ) : null}
              </View>
              <Pressable
                onPress={async () => {
                  await removeOutboxItem(o.id);
                  await refreshOutbox();
                  toast("Removed from queue");
                }}
                style={styles.pendingRemove}
                accessibilityRole="button"
                accessibilityLabel="Remove queued message"
              >
                <Text style={styles.pendingRemoveText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      ) : null}
      <Card style={styles.form}>
        <Text style={styles.title}>Submit a suggestion</Text>
        <Textarea
          value={message}
          onChangeText={setMessage}
          placeholder="Your feedback or idea…"
          style={{ minHeight: 100 }}
        />
        {pickedImages.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
            {pickedImages.map((img, idx) => (
              <View key={`${img.uri}-${idx}`} style={styles.thumbWrap}>
                <Image source={{ uri: img.uri }} style={styles.thumb} />
                <Pressable onPress={() => removePickedAt(idx)} style={styles.thumbRemove}>
                  <Text style={styles.thumbRemoveText}>×</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.actions}>
          <Button title="Add images" variant="outline" onPress={pickImages} disabled={submitting} />
          <Button
            title={submitting ? "Sending…" : "Submit"}
            onPress={submit}
            disabled={submitting || (!message.trim() && pickedImages.length === 0)}
          />
        </View>
      </Card>
      {isSuperAdmin && loading ? <ActivityIndicator color={tokens.colors.primary} style={{ marginVertical: 12 }} /> : null}
    </View>
  );

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Sign in to send suggestions from the app.</Text>
      </View>
    );
  }

  const removeSuggestion = async (id: string) => {
    await supabase.from("suggestions").delete().eq("id", id);
    setList((prev) => prev.filter((row) => row.id !== id));
    toast("Suggestion deleted");
  };

  return (
    <KeyboardSafeView>
    <FlatList
      data={list}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      contentContainerStyle={styles.list}
      {...FAST_LIST}
      ListEmptyComponent={!loading ? <Text style={styles.muted}>No suggestions yet.</Text> : null}
      renderItem={({ item }) => (
        <Card style={styles.item}>
          <Text style={styles.body}>{item.message}</Text>
          {item.image_paths && item.image_paths.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachRow}>
              {item.image_paths.map((path) => (
                <Image
                  key={path}
                  source={{ uri: getPublicAttachmentUrl(path) }}
                  style={styles.attachImg}
                />
              ))}
            </ScrollView>
          ) : null}
          <Text style={styles.meta}>
            {new Date(item.created_at).toLocaleString()}
            {item.user_id ? ` · user ${item.user_id.slice(0, 8)}…` : ""}
          </Text>
          {isSuperAdmin ? (
            <Button title="Delete" variant="destructive" size="sm" onPress={() => void removeSuggestion(item.id)} />
          ) : null}
        </Card>
      )}
    />
    </KeyboardSafeView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", padding: 24 },
  list: { paddingBottom: 40 },
  headerBlock: { padding: 18, paddingBottom: 8, gap: 4 },
  intro: { fontSize: 14, color: tokens.colors.mutedForeground, marginBottom: 8 },
  offlineBanner: {
    backgroundColor: tokens.colors.accentStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    padding: 12,
    marginBottom: 10,
  },
  offlineBannerText: { fontSize: 13, color: tokens.colors.foreground, fontWeight: "600" },
  pendingCard: { padding: 14, gap: 10, marginBottom: 4 },
  pendingTitle: { fontSize: 15, fontWeight: "800", color: tokens.colors.foreground },
  pendingSub: { fontSize: 12, color: tokens.colors.mutedForeground },
  pendingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.colors.border,
  },
  pendingBody: { fontSize: 13, color: tokens.colors.foreground },
  pendingMeta: { fontSize: 11, color: tokens.colors.mutedForeground, marginTop: 4 },
  pendingRemove: { paddingVertical: 6, paddingHorizontal: 8 },
  pendingRemoveText: { fontSize: 12, fontWeight: "700", color: tokens.colors.destructive },
  form: { padding: 14, gap: 10 },
  title: { fontSize: 17, fontWeight: "800" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" },
  thumbRow: { maxHeight: 88 },
  thumbWrap: { marginRight: 10 },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  thumbRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: tokens.colors.destructive,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbRemoveText: { color: "#fff", fontSize: 16, fontWeight: "700", lineHeight: 18 },
  item: { marginHorizontal: 18, marginBottom: 10, padding: 14, gap: 6 },
  body: { fontSize: 14, color: tokens.colors.foreground },
  attachRow: { maxHeight: 120, marginTop: 4 },
  attachImg: { width: 100, height: 100, borderRadius: 8, marginRight: 8 },
  meta: { fontSize: 11, color: tokens.colors.muted },
  muted: { textAlign: "center", color: tokens.colors.mutedForeground, padding: 24 },
});
