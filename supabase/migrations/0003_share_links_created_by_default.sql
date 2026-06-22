-- ============================================================================
-- ÁRVORE GENEALÓGICA — FLIVE
-- genea_share_links.created_by é NOT NULL; preenche automaticamente com o
-- usuário autenticado, evitando erro ao gerar link de compartilhamento.
-- (O app também passa created_by explicitamente; este default é redundância
--  segura para qualquer caminho de inserção.)
-- ============================================================================
alter table genea_share_links alter column created_by set default auth.uid();
