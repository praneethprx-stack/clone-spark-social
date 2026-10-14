import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MAX_UPLOAD_MB = 50;

export async function uploadMedia(file: File, userId: string): Promise<{ path: string; type: "image" | "video" }> {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`File must be under ${MAX_UPLOAD_MB}MB`);
  const type = file.type.startsWith("video") ? "video" : "image";
  if (!file.type.startsWith("video") && !file.type.startsWith("image")) throw new Error("Only images or videos allowed");
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return { path, type };
}

/** Resolves a storage path (or external URL) to a viewable URL. */
export function useMediaUrl(path: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["media", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      if (!path) return null;
      if (/^https?:/.test(path) || path.startsWith("blob:")) return path;
      const { data, error } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60);
      if (error) return null;
      return data.signedUrl;
    },
  });
  return data ?? null;
}
