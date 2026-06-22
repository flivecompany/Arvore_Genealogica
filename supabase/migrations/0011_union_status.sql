-- ============================================================================
-- ÁRVORE GENEALÓGICA — FLIVE  ·  Situação da união (cônjuge atual / ex-cônjuge)
-- Permite registrar que uma pessoa foi casada e hoje está divorciada/separada,
-- mantendo o vínculo histórico e podendo ter um novo cônjuge.
--   status: married | partners | separated | divorced | widowed
-- ============================================================================

alter table genea_unions
  add column if not exists status text not null default 'married';
