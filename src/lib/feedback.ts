import { supabase } from "@/integrations/supabase/client";
import type {
  FeatureUpdate,
  FeatureStatus,
  Suggestion,
  SuggestionStatus,
} from "@/integrations/supabase/types";

// ---------------------- Novidades / novos recursos ----------------------

/** Lista as novidades. Usuários comuns recebem só as publicadas (RLS); o
 *  superadmin recebe todas. Resiliente caso a migration não esteja aplicada. */
export async function listFeatureUpdates(): Promise<FeatureUpdate[]> {
  const { data, error } = await supabase
    .from("genea_feature_updates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as FeatureUpdate[]) ?? [];
}

/** Cria uma novidade (somente superadmin — garantido por RLS). */
export async function createFeatureUpdate(input: {
  title: string;
  description?: string;
  status?: FeatureStatus;
  published?: boolean;
}): Promise<void> {
  const { error } = await supabase.from("genea_feature_updates").insert({
    title: input.title,
    description: input.description?.trim() || null,
    status: input.status ?? "planned",
    published: input.published ?? true,
  });
  if (error) throw error;
}

export async function updateFeatureUpdate(
  id: string,
  patch: Partial<Pick<FeatureUpdate, "title" | "description" | "status" | "published">>
): Promise<void> {
  const { error } = await supabase.from("genea_feature_updates").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteFeatureUpdate(id: string): Promise<void> {
  const { error } = await supabase.from("genea_feature_updates").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------- Sugestões dos usuários ----------------------

/** Envia uma sugestão. user_id/email são preenchidos no servidor (trigger). */
export async function createSuggestion(title: string, description: string): Promise<void> {
  const { error } = await supabase
    .from("genea_suggestions")
    .insert({ title: title.trim(), description: description.trim() || null });
  if (error) throw error;
}

/** Lista as sugestões visíveis pela RLS: as próprias (usuário comum) ou todas
 *  (superadmin). */
export async function listSuggestions(): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from("genea_suggestions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as Suggestion[]) ?? [];
}

/** Atualiza o status de uma sugestão (triagem — somente superadmin via RLS). */
export async function updateSuggestionStatus(id: string, status: SuggestionStatus): Promise<void> {
  const { error } = await supabase.from("genea_suggestions").update({ status }).eq("id", id);
  if (error) throw error;
}

// ---------------------- Rótulos para a UI ----------------------

export const FEATURE_STATUS_LABEL: Record<FeatureStatus, string> = {
  planned: "Planejado",
  in_progress: "Em desenvolvimento",
  done: "Lançado",
};

export const SUGGESTION_STATUS_LABEL: Record<SuggestionStatus, string> = {
  new: "Nova",
  planned: "Planejada",
  done: "Concluída",
  declined: "Recusada",
};
