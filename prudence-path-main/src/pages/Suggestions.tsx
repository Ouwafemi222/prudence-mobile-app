import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, Send, Trash2, Shield, X } from "lucide-react";
import { ImageDropzone } from "@/components/ui/image-dropzone";

type SuggestionRow = {
  id: string;
  message: string;
  created_at: string;
  user_id: string | null;
  image_paths: string[] | null;
};

export default function Suggestions() {
  const { user, userRole } = useAuth();
  const isSuperAdmin = userRole?.role === "super_admin";
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);

  const isAnonymousMode = useMemo(() => !user, [user]);

  const getPublicAttachmentUrl = (path: string): string => {
    return supabase.storage.from("suggestion_attachments").getPublicUrl(path).data.publicUrl;
  };

  const uploadAttachments = async (files: File[]): Promise<string[]> => {
    const uploaded: string[] = [];
    const folder = user?.id || "anon";

    for (let i = 0; i < files.length; i += 1) {
      const f = files[i];
      const ext = f.name.split(".").pop() || "jpg";
      const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
      const fileName = `${folder}/${Date.now()}_${i}.${safeExt || "jpg"}`;

      const { error } = await supabase.storage.from("suggestion_attachments").upload(fileName, f);
      if (error) throw error;
      uploaded.push(fileName);
    }

    return uploaded;
  };

  const submit = async () => {
    const text = message.trim();
    if (!text && images.length === 0) return;

    setSubmitting(true);
    try {
      let imagePaths: string[] = [];
      if (images.length) {
        try {
          imagePaths = await uploadAttachments(images);
        } catch (uploadErr: any) {
          console.error("Suggestion attachment upload failed:", uploadErr);
          // Still submit the message even if images fail (e.g., bucket not yet created).
          toast.warning("Image upload failed", {
            description: "Your suggestion will be submitted without images.",
          });
          imagePaths = [];
        }
      }
      const { error } = await supabase.from("suggestions").insert({
        message: text || "(image-only suggestion)",
        image_paths: imagePaths.length ? imagePaths : null,
      });
      if (error) throw error;
      setMessage("");
      setImages([]);
      toast.success("Suggestion submitted");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to submit suggestion", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suggestions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setSuggestions((data || []) as SuggestionRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load suggestions", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const deleteSuggestion = async (id: string) => {
    try {
      const row = suggestions.find((s) => s.id === id);
      if (row?.image_paths && row.image_paths.length > 0) {
        // Best-effort cleanup (requires super_admin storage policy)
        await supabase.storage.from("suggestion_attachments").remove(row.image_paths);
      }
      const { error } = await supabase.from("suggestions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Deleted");
      await fetchSuggestions();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to delete", { description: e.message });
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Suggestion Box</h1>
          <p className="text-muted-foreground mt-1">
            Submit suggestions anonymously (no login required).
          </p>
          <div className="mt-2 text-sm text-muted-foreground">
            <Link className="text-primary hover:underline" to="/auth">
              Log in
            </Link>{" "}
            to access your dashboard.
          </div>
        </div>

        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Submit a suggestion</GlassCardTitle>
            <GlassCardDescription>
              {isAnonymousMode
                ? "You are not logged in — your suggestion will be anonymous."
                : "If you’re logged in, the system may store your user_id for admin auditing (not shown to other users)."}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="space-y-3">
            <Textarea
              placeholder="Write your suggestion..."
              className="min-h-[160px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <ImageDropzone
              files={images}
              onFilesChange={setImages}
              disabled={submitting}
              label="Drop images here or tap to upload (optional)"
            />

            <div className="flex justify-end">
              <Button onClick={submit} disabled={submitting || (!message.trim() && images.length === 0)}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </GlassCardContent>
        </GlassCard>

        {isSuperAdmin && (
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Super Admin Dashboard
              </GlassCardTitle>
              <GlassCardDescription>
                Only super admins can see this list. Suggestions can include images and may have a user_id if submitted while logged in (we do not show identity beyond the user_id).
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="flex justify-end mb-3">
                <Button variant="outline" onClick={fetchSuggestions} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No suggestions yet.</div>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((s) => (
                    <div key={s.id} className="p-4 rounded-xl bg-accent/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-muted-foreground">
                            {new Date(s.created_at).toLocaleString()} •{" "}
                            {s.user_id ? "submitted while logged in" : "anonymous"}
                          </p>
                          <p className="text-sm text-foreground whitespace-pre-wrap mt-2">{s.message}</p>
                          {s.user_id && (
                            <Input className="mt-3" value={s.user_id} readOnly />
                          )}
                          {s.image_paths && s.image_paths.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              {s.image_paths.map((p) => (
                                <a
                                  key={p}
                                  href={getPublicAttachmentUrl(p)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block p-3 rounded-lg bg-background/40 border border-border/50 hover:bg-background/60 transition-colors"
                                >
                                  {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                                  <img
                                    alt="Suggestion attachment image"
                                    className="rounded-md w-full max-h-56 object-cover"
                                    src={getPublicAttachmentUrl(p)}
                                  />
                                  <p className="text-xs text-muted-foreground mt-2">Click to open full size</p>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteSuggestion(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        )}
      </div>
    </div>
  );
}


