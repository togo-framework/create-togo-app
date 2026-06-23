import { createClient } from "./client";

// Thin helpers over Supabase Storage. Create a bucket in your Supabase project
// (or via the dashboard) and reference it by name.
export async function uploadFile(bucket: string, path: string, file: File) {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
  });
  if (error) throw error;
  return data;
}

export function publicUrl(bucket: string, path: string) {
  const supabase = createClient();
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function listFiles(bucket: string, prefix = "") {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(bucket).list(prefix);
  if (error) throw error;
  return data;
}
