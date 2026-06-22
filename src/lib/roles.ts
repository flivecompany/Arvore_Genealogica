import type { MemberRole } from "@/integrations/supabase/types";

/** Rótulos amigáveis dos papéis. "editor" é apresentado como "Gestor". */
export const ROLE_LABEL: Record<MemberRole, string> = {
  admin: "Administrador",
  editor: "Gestor",
  viewer: "Visualizador",
  pending: "Pendente",
};

export const ROLE_DESC: Record<MemberRole, string> = {
  admin:
    "Controle total: gerencia membros, aprova acessos, gera convites/links, edita e remove tudo.",
  editor:
    "Edita o conteúdo da árvore (adiciona, edita e vincula pessoas), mas não gerencia membros nem aprova acessos.",
  viewer: "Apenas visualiza a árvore; não pode editar.",
  pending: "Solicitou acesso e aguarda a aprovação de um administrador.",
};
