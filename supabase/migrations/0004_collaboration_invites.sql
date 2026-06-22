-- ============================================================================
-- ÁRVORE GENEALÓGICA — FLIVE  ·  Colaboração com moderação (aprovar 1x)
-- Link de convite para edição → convidado (autenticado) solicita acesso
-- (vira membro 'pending') → admin aprova uma vez (→ 'editor') → edita livre.
-- ============================================================================

-- Novo papel "pending" (aguardando aprovação). Não pode ser usado na mesma
-- transação em que é criado, mas só o referenciamos em runtime.
alter type genea_role add value if not exists 'pending';

-- Identificação do membro (para o admin saber quem aprovar).
alter table genea_members add column if not exists email text;
alter table genea_members add column if not exists display_name text;

-- Links de convite para EDIÇÃO (distinto do link público somente-leitura).
create table if not exists genea_invite_links (
  token        text primary key default encode(gen_random_bytes(16), 'hex'),
  tree_id      uuid not null references genea_trees(id) on delete cascade,
  created_by   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expires_at   timestamptz,
  revoked      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists genea_invite_tree_idx on genea_invite_links(tree_id);

alter table genea_invite_links enable row level security;
drop policy if exists invite_admin on genea_invite_links;
create policy invite_admin on genea_invite_links for all
  using (genea_is_admin(tree_id)) with check (genea_is_admin(tree_id));
