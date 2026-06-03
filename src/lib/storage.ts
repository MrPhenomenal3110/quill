import type { SupabaseClient } from "@supabase/supabase-js";

const POST_IMAGES_BUCKET = "post-images";

export async function uploadPostImage(
  supabase: SupabaseClient,
  file: File,
  userId: string,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin";
  const path = `${userId}/${crypto.randomUUID()}.${safeExt}`;

  const { error } = await supabase.storage.from(POST_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
