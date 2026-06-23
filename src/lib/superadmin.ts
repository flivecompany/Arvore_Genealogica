import { supabase } from "@/integrations/supabase/client";
import type {
  PlatformSettings,
  PlatformStats,
  Superadmin,
  AccessStats,
} from "@/integrations/supabase/types";

/** O usuário atual é superadmin da plataforma? (resiliente se a RPC não existir) */
export async function isSuperadmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("genea_is_superadmin");
  if (error) return false;
  return data === true;
}

/** Configurações públicas (nome + aviso) — visíveis a qualquer usuário. */
export async function getPublicSettings(): Promise<{
  platform_name?: string;
  announcement?: string | null;
}> {
  const { data, error } = await supabase.rpc("genea_public_settings");
  if (error || !data) return {};
  return data as { platform_name?: string; announcement?: string | null };
}

/** Métricas globais da plataforma (somente superadmin). */
export async function getPlatformStats(): Promise<PlatformStats | null> {
  const { data, error } = await supabase.rpc("genea_platform_stats");
  if (error) throw error;
  return (data as PlatformStats) ?? null;
}

/** Lê as configurações globais completas (somente superadmin). */
export async function getPlatformSettings(): Promise<PlatformSettings | null> {
  const { data, error } = await supabase
    .from("genea_platform_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return (data as PlatformSettings) ?? null;
}

export async function updatePlatformSettings(
  patch: Partial<Pick<PlatformSettings, "platform_name" | "support_email" | "announcement" | "allow_signups">>
): Promise<PlatformSettings | null> {
  const { data, error } = await supabase.rpc("genea_update_settings", { p: patch });
  if (error) throw error;
  return (data as PlatformSettings) ?? null;
}

export async function listSuperadmins(): Promise<Superadmin[]> {
  const { data, error } = await supabase
    .from("genea_superadmins")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Superadmin[]) ?? [];
}

export async function setSuperadmin(email: string, grant: boolean): Promise<void> {
  const { error } = await supabase.rpc("genea_set_superadmin", {
    p_email: email,
    p_grant: grant,
  });
  if (error) throw error;
}

// ---------------------- Estatísticas de acesso ----------------------
/** Registra um acesso (com throttle no servidor). Resiliente: ignora erros. */
export async function recordAccess(path?: string): Promise<void> {
  try {
    await supabase.rpc("genea_record_access", { p_path: path ?? null });
  } catch {
    /* migration pode não existir ainda — silencioso */
  }
}

/** Estatísticas de acesso (somente superadmin). */
export async function getAccessStats(days = 30): Promise<AccessStats | null> {
  const { data, error } = await supabase.rpc("genea_access_stats", { p_days: days });
  if (error) throw error;
  return (data as AccessStats) ?? null;
}
