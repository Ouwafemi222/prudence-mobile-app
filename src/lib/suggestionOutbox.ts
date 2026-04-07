import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "../integrations/supabase/client";
import { getLocalUriAsUploadBody } from "./localFileForUpload";

const STORAGE_KEY = "pp.suggestions.outbox.v1";

export type OutboxSuggestion = {
  id: string;
  message: string;
  imageUris: string[];
  createdAt: number;
};

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function loadOutbox(): Promise<OutboxSuggestion[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is OutboxSuggestion =>
        x &&
        typeof x === "object" &&
        typeof (x as OutboxSuggestion).id === "string" &&
        typeof (x as OutboxSuggestion).message === "string" &&
        Array.isArray((x as OutboxSuggestion).imageUris) &&
        typeof (x as OutboxSuggestion).createdAt === "number",
    );
  } catch {
    return [];
  }
}

async function saveOutbox(items: OutboxSuggestion[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** True when the device reports no connection (safe to queue without trying the server). */
export async function isDefinitelyOffline(): Promise<boolean> {
  try {
    const s = await NetInfo.fetch();
    return s.isConnected === false;
  } catch {
    return false;
  }
}

export function isLikelyNetworkFailure(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  if (!msg) return false;
  return /network|fetch failed|internet|offline|timeout|ECONNREFUSED|ENETUNREACH|Failed to fetch/i.test(msg);
}

export async function enqueueSuggestion(message: string, imageUris: string[]): Promise<OutboxSuggestion> {
  const trimmed = message.trim();
  const item: OutboxSuggestion = {
    id: randomId(),
    message: trimmed || "(image-only suggestion)",
    imageUris: [...imageUris],
    createdAt: Date.now(),
  };
  const existing = await loadOutbox();
  existing.push(item);
  await saveOutbox(existing);
  return item;
}

export async function removeOutboxItem(id: string): Promise<void> {
  const existing = await loadOutbox();
  await saveOutbox(existing.filter((x) => x.id !== id));
}

async function uploadSuggestionImages(userId: string, uris: string[]): Promise<string[]> {
  const uploaded: string[] = [];
  const folder = userId || "anon";
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
}

/**
 * Sends queued suggestions to Supabase. Keeps failed items in the outbox.
 */
export async function flushSuggestionOutbox(userId: string | undefined): Promise<void> {
  if (await isDefinitelyOffline()) return;

  let items = await loadOutbox();
  if (items.length === 0) return;

  const failed: OutboxSuggestion[] = [];

  for (const item of items) {
    try {
      let imagePaths: string[] = [];
      if (item.imageUris.length > 0) {
        imagePaths = await uploadSuggestionImages(userId || "anon", item.imageUris);
      }
      const { error } = await supabase.from("suggestions").insert({
        message: item.message || "(image-only suggestion)",
        image_paths: imagePaths.length ? imagePaths : null,
      });
      if (error) throw error;
    } catch {
      failed.push(item);
    }
  }

  await saveOutbox(failed);
}
