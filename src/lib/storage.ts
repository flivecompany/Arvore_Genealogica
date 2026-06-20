import { supabase } from "@/integrations/supabase/client";

const BUCKET = "genea-media";

/** Faz upload de um arquivo no caminho <treeId>/<subpasta>/<arquivo>. */
export async function uploadFile(
  treeId: string,
  file: File,
  subfolder = "avatars"
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${treeId}/${subfolder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** URL assinada temporária para um caminho privado. */
export async function signedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  if (!path) return null;
  // já é URL absoluta (ex.: avatar externo)
  if (/^https?:\/\//.test(path)) return path;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function removeFile(path: string): Promise<void> {
  if (!path || /^https?:\/\//.test(path)) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
