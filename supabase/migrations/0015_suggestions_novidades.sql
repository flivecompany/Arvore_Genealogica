-- ============================================================================
-- ÁRVORE GENEALÓGICA — FLIVE  ·  Novidades & Sugestões
--   • genea_feature_updates: lista de novos recursos / roadmap, curada pelo
--     superadmin. Qualquer usuário autenticado vê os itens publicados.
--   • genea_suggestions: sugestões enviadas pelos usuários (privadas). Cada um
--     vê só as próprias; o superadmin vê todas e muda o status (triagem).
-- ============================================================================

-- Lista de novos recursos / novidades (curadoria do superadmin) -------------
create table if not exists genea_feature_updates (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  status      text not null default 'planned'
              check (status in ('planned','in_progress','done')),
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid
);
create index if not exists idx_feature_updates_created
  on genea_feature_updates(created_at desc);

-- Sugestões dos usuários (privadas + triagem) -------------------------------
create table if not exists genea_suggestions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  email       text,
  title       text not null,
  description text,
  status      text not null default 'new'
              check (status in ('new','planned','done','declined')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_suggestions_user
  on genea_suggestions(user_id, created_at desc);

-- Preenche user_id/email no servidor (não confia no cliente). ----------------
create or replace function genea_suggestion_fill()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.email := (select email from auth.users where id = auth.uid());
  return new;
end; $$;
drop trigger if exists trg_suggestion_fill on genea_suggestions;
create trigger trg_suggestion_fill before insert on genea_suggestions
  for each row execute function genea_suggestion_fill();

alter table genea_feature_updates enable row level security;
alter table genea_suggestions     enable row level security;

-- Novidades: todos autenticados leem as publicadas; superadmin lê tudo e gerencia.
drop policy if exists feature_updates_read on genea_feature_updates;
create policy feature_updates_read on genea_feature_updates for select
  using (published = true or genea_is_superadmin());
drop policy if exists feature_updates_manage on genea_feature_updates;
create policy feature_updates_manage on genea_feature_updates for all
  using (genea_is_superadmin()) with check (genea_is_superadmin());

-- Sugestões: o autor cria/lê as próprias; o superadmin lê todas e atualiza o status.
drop policy if exists suggestions_insert on genea_suggestions;
create policy suggestions_insert on genea_suggestions for insert
  with check (user_id = auth.uid());
drop policy if exists suggestions_read on genea_suggestions;
create policy suggestions_read on genea_suggestions for select
  using (user_id = auth.uid() or genea_is_superadmin());
drop policy if exists suggestions_update on genea_suggestions;
create policy suggestions_update on genea_suggestions for update
  using (genea_is_superadmin()) with check (genea_is_superadmin());

grant select, insert, update, delete on genea_feature_updates to authenticated;
grant select, insert, update          on genea_suggestions     to authenticated;
