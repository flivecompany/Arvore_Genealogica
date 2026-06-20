-- ============================================================================
-- ÁRVORE GENEALÓGICA — FLIVE  ·  Blindagem de privilégios de funções
-- Recomendado pelos advisors do Supabase. O Supabase concede EXECUTE a
-- `anon`/`authenticated` por padrão; aqui revogamos onde não é necessário.
-- ============================================================================

-- Funções de TRIGGER não devem ser chamáveis via API (PostgREST).
-- Os gatilhos continuam disparando normalmente após o revoke.
revoke execute on function genea_audit() from public, anon, authenticated;
revoke execute on function genea_touch_updated_at() from public, anon, authenticated;

-- Auxiliares de RLS e RPCs de aplicação: o papel anon não precisa delas.
-- (authenticated mantém EXECUTE: exigido pela avaliação das políticas RLS e
--  pelas chamadas RPC autenticadas do app.)
revoke execute on function genea_is_member(uuid)        from anon;
revoke execute on function genea_can_edit(uuid)         from anon;
revoke execute on function genea_is_admin(uuid)         from anon;
revoke execute on function genea_tree_stats(uuid)       from anon;
revoke execute on function genea_create_tree(text,text) from anon;

-- genea_shared_tree(text) permanece acessível a anon: é a visualização
-- pública por token (link de compartilhamento somente leitura).
