import { supabase } from "@/integrations/supabase/client";
import type {
  Person,
  Union,
  Tree,
  Media,
  TreeStats,
  ShareLink,
  AuditEntry,
  Member,
  MemberRole,
  InviteLink,
  AppNotification,
  GlobalPersonMatch,
  LinkRequest,
  PendingConsent,
  UnionStatus,
} from "@/integrations/supabase/types";

// ---------------------- Árvores ----------------------
export async function listMyTrees(): Promise<Tree[]> {
  const { data, error } = await supabase
    .from("genea_trees")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Tree[]) ?? [];
}

export async function createTree(name: string, description?: string): Promise<Tree> {
  const { data, error } = await supabase.rpc("genea_create_tree", {
    p_name: name,
    p_description: description ?? null,
  });
  if (error) throw error;
  return data as Tree;
}

export async function getTreeStats(treeId: string): Promise<TreeStats | null> {
  const { data, error } = await supabase.rpc("genea_tree_stats", {
    p_tree: treeId,
  });
  if (error) throw error;
  return data as TreeStats | null;
}

// ---------------------- Pessoas ----------------------
export async function listPeople(treeId: string): Promise<Person[]> {
  const { data, error } = await supabase
    .from("genea_people")
    .select("*")
    .eq("tree_id", treeId)
    .order("first_name", { ascending: true });
  if (error) throw error;
  return (data as Person[]) ?? [];
}

export async function getPerson(id: string): Promise<Person | null> {
  const { data, error } = await supabase
    .from("genea_people")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Person) ?? null;
}

export type PersonInput = Partial<Person> & { tree_id: string; first_name: string };

export async function upsertPerson(input: PersonInput): Promise<Person> {
  const payload = { ...input };
  const { data, error } = await supabase
    .from("genea_people")
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Person;
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase.from("genea_people").delete().eq("id", id);
  if (error) throw error;
}

/** Define pai ou mãe de uma pessoa (usado ao adicionar parentes pela árvore). */
export async function setPersonParent(
  childId: string,
  which: "father" | "mother",
  parentId: string | null
): Promise<void> {
  const col = which === "father" ? "father_id" : "mother_id";
  const { error } = await supabase
    .from("genea_people")
    .update({ [col]: parentId })
    .eq("id", childId);
  if (error) throw error;
}

// ---------------------- Uniões ----------------------
export async function listUnions(treeId: string): Promise<Union[]> {
  const { data, error } = await supabase
    .from("genea_unions")
    .select("*")
    .eq("tree_id", treeId);
  if (error) throw error;
  return (data as Union[]) ?? [];
}

export async function addUnion(
  treeId: string,
  partner1Id: string,
  partner2Id: string,
  kind = "marriage",
  status: UnionStatus = "married"
): Promise<Union> {
  const { data, error } = await supabase
    .from("genea_unions")
    .insert({
      tree_id: treeId,
      partner1_id: partner1Id,
      partner2_id: partner2Id,
      kind,
      status,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Union;
}

/** Atualiza uma união (ex.: marcar como divorciado/separado, datas). */
export async function updateUnion(
  id: string,
  fields: Partial<Pick<Union, "status" | "kind" | "started_on" | "ended_on" | "place">>
): Promise<void> {
  const { error } = await supabase.from("genea_unions").update(fields).eq("id", id);
  if (error) throw error;
}

export async function deleteUnion(id: string): Promise<void> {
  const { error } = await supabase.from("genea_unions").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------- Mídia ----------------------
export async function listMedia(personId: string): Promise<Media[]> {
  const { data, error } = await supabase
    .from("genea_media")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Media[]) ?? [];
}

export async function addMediaRecord(m: Partial<Media>): Promise<Media> {
  const { data, error } = await supabase
    .from("genea_media")
    .insert(m)
    .select()
    .single();
  if (error) throw error;
  return data as Media;
}

// ---------------------- Compartilhamento ----------------------
export async function createShareLink(
  treeId: string,
  expiresAt?: string | null
): Promise<ShareLink> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("genea_share_links")
    .insert({ tree_id: treeId, created_by: user?.id, expires_at: expiresAt ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as ShareLink;
}

export async function listShareLinks(treeId: string): Promise<ShareLink[]> {
  const { data, error } = await supabase
    .from("genea_share_links")
    .select("*")
    .eq("tree_id", treeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ShareLink[]) ?? [];
}

export async function revokeShareLink(token: string): Promise<void> {
  const { error } = await supabase
    .from("genea_share_links")
    .update({ revoked: true })
    .eq("token", token);
  if (error) throw error;
}

export async function fetchSharedTree(
  token: string
): Promise<{ tree: Tree; people: Person[]; unions: Union[] } | null> {
  const { data, error } = await supabase.rpc("genea_shared_tree", {
    p_token: token,
  });
  if (error) throw error;
  return data as { tree: Tree; people: Person[]; unions: Union[] } | null;
}

// ---------------------- Convites de edição (colaboração) ----------------------
export async function createInviteLink(
  treeId: string,
  expiresAt?: string | null
): Promise<InviteLink> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("genea_invite_links")
    .insert({ tree_id: treeId, created_by: user?.id, expires_at: expiresAt ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as InviteLink;
}

export async function listInviteLinks(treeId: string): Promise<InviteLink[]> {
  const { data, error } = await supabase
    .from("genea_invite_links")
    .select("*")
    .eq("tree_id", treeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as InviteLink[]) ?? [];
}

export async function revokeInviteLink(token: string): Promise<void> {
  const { error } = await supabase
    .from("genea_invite_links")
    .update({ revoked: true })
    .eq("token", token);
  if (error) throw error;
}

export interface JoinResult {
  status: "pending" | "member" | "invalid" | "unauthenticated";
  tree_id?: string;
  tree_name?: string;
  role?: MemberRole;
}

export async function joinTree(token: string): Promise<JoinResult> {
  const { data, error } = await supabase.rpc("genea_join_tree", { p_token: token });
  if (error) throw error;
  return data as JoinResult;
}

// ---------------------- Membros / aprovação ----------------------
export async function listMembers(treeId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from("genea_members")
    .select("*")
    .eq("tree_id", treeId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Member[]) ?? [];
}

export async function setMemberRole(
  treeId: string,
  userId: string,
  role: MemberRole
): Promise<void> {
  const { error } = await supabase
    .from("genea_members")
    .update({ role })
    .eq("tree_id", treeId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Aprova um membro pendente (vira gestor/editor) e notifica a pessoa.
 *  Se a RPC ainda não existir no banco, cai para a atualização direta do papel. */
export async function approveMember(treeId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("genea_approve_member", {
    p_tree: treeId,
    p_user: userId,
  });
  if (error) {
    await setMemberRole(treeId, userId, "editor");
  }
}

export async function removeMember(treeId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("genea_members")
    .delete()
    .eq("tree_id", treeId)
    .eq("user_id", userId);
  if (error) throw error;
}

// ---------------------- Notificações ----------------------
export async function listNotifications(limit = 30): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("genea_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as AppNotification[]) ?? [];
}

export async function markNotificationsRead(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("genea_notifications")
    .update({ read: true })
    .in("id", ids);
  if (error) throw error;
}

/** Membro pendente reenvia o pedido de aprovação aos administradores. */
export async function requestApproval(treeId: string): Promise<void> {
  const { error } = await supabase.rpc("genea_request_approval", { p_tree: treeId });
  if (error) throw error;
}

// ---------------------- Vínculo entre árvores (consentimento) ----------------------
/** Busca pessoas em outras árvores da plataforma — retorna apenas o nome. */
export async function searchGlobalPeople(query: string): Promise<GlobalPersonMatch[]> {
  if (query.trim().length < 3) return [];
  const { data, error } = await supabase.rpc("genea_search_people_global", {
    p_query: query,
  });
  if (error) throw error;
  return (data as GlobalPersonMatch[]) ?? [];
}

/** Solicita incluir, na sua árvore, uma pessoa que existe em outra árvore. */
export async function requestPersonLink(
  targetPersonId: string,
  requesterTreeId: string
): Promise<{ status: string }> {
  const { data, error } = await supabase.rpc("genea_request_person_link", {
    p_target_person: targetPersonId,
    p_requester_tree: requesterTreeId,
  });
  if (error) throw error;
  return data as { status: string };
}

/** Pedidos de vínculo recebidos (pendentes) na árvore ativa. */
export async function listLinkRequests(): Promise<LinkRequest[]> {
  const { data, error } = await supabase
    .from("genea_link_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as LinkRequest[]) ?? [];
}

export async function resolveLinkRequest(id: number, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc("genea_resolve_link_request", {
    p_request: id,
    p_approve: approve,
  });
  if (error) throw error;
}

// ---------------------- Consentimento por e-mail ----------------------
/** Anuncia a pessoa (após salvar com e-mail): notifica o usuário, se existir. */
export async function announcePerson(personId: string): Promise<void> {
  const { error } = await supabase.rpc("genea_announce_person", {
    p_person: personId,
  });
  // RPC pode não existir ainda (migration não aplicada) — ignora silenciosamente.
  if (error && import.meta.env.DEV) console.warn("announcePerson:", error.message);
}

export async function listMyPendingConsents(): Promise<PendingConsent[]> {
  const { data, error } = await supabase.rpc("genea_my_pending_consents");
  if (error) return [];
  return (data as PendingConsent[]) ?? [];
}

export async function resolveConsent(id: number, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc("genea_resolve_consent", {
    p_id: id,
    p_accept: accept,
  });
  if (error) throw error;
}

// ---------------------- Auditoria ----------------------
export async function listAudit(treeId: string, limit = 100): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from("genea_audit_log")
    .select("*")
    .eq("tree_id", treeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as AuditEntry[]) ?? [];
}
