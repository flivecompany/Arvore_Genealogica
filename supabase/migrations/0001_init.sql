-- ============================================================================
-- ÁRVORE GENEALÓGICA — FLIVE  ·  Schema inicial
-- Prefixo `genea_` para conviver com outros módulos no mesmo projeto Supabase
-- (ecossistema "Controle Flive"). Inclui: tabelas, RLS, auditoria, storage,
-- compartilhamento público por token e estatísticas.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  create type genea_sex as enum ('male', 'female', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type genea_role as enum ('admin', 'editor', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type genea_media_kind as enum ('photo', 'document', 'other');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- TABELAS
-- ---------------------------------------------------------------------------

-- Árvores (cada conta pode ter uma ou mais; multi-tenant por árvore)
create table if not exists genea_trees (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  cover_url   text,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Membros / permissões por árvore (Administrador e Usuário do prompt)
create table if not exists genea_members (
  tree_id    uuid not null references genea_trees(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       genea_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (tree_id, user_id)
);

-- Pessoas
create table if not exists genea_people (
  id             uuid primary key default gen_random_uuid(),
  tree_id        uuid not null references genea_trees(id) on delete cascade,
  first_name     text not null,
  last_name      text,
  maiden_name    text,
  nickname       text,
  sex            genea_sex not null default 'other',
  -- nascimento / falecimento
  birth_date     date,
  birth_date_text text,                       -- datas parciais/aproximadas ("c. 1890")
  birth_place    text,
  death_date     date,
  death_date_text text,
  death_place    text,
  is_living      boolean not null default true,
  -- relacionamentos de sangue (irmãos são derivados de pais comuns)
  father_id      uuid references genea_people(id) on delete set null,
  mother_id      uuid references genea_people(id) on delete set null,
  -- perfil
  avatar_url     text,
  occupation     text,
  biography      text,
  notes          text,
  social_links   jsonb not null default '[]'::jsonb,  -- [{label,url}]
  -- meta
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists genea_people_tree_idx   on genea_people(tree_id);
create index if not exists genea_people_father_idx  on genea_people(father_id);
create index if not exists genea_people_mother_idx  on genea_people(mother_id);
create index if not exists genea_people_search_idx
  on genea_people using gin (to_tsvector('simple',
    coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' ||
    coalesce(maiden_name,'') || ' ' || coalesce(nickname,'') || ' ' ||
    coalesce(birth_place,'')));

-- Uniões / casamentos (cônjuges)
create table if not exists genea_unions (
  id          uuid primary key default gen_random_uuid(),
  tree_id     uuid not null references genea_trees(id) on delete cascade,
  partner1_id uuid not null references genea_people(id) on delete cascade,
  partner2_id uuid not null references genea_people(id) on delete cascade,
  kind        text not null default 'marriage',  -- marriage | partnership
  started_on  date,
  ended_on    date,
  place       text,
  created_at  timestamptz not null default now(),
  check (partner1_id <> partner2_id)
);
create index if not exists genea_unions_tree_idx on genea_unions(tree_id);
create index if not exists genea_unions_p1_idx on genea_unions(partner1_id);
create index if not exists genea_unions_p2_idx on genea_unions(partner2_id);

-- Mídia: fotos (galeria) e documentos anexos por pessoa
create table if not exists genea_media (
  id           uuid primary key default gen_random_uuid(),
  tree_id      uuid not null references genea_trees(id) on delete cascade,
  person_id    uuid references genea_people(id) on delete cascade,
  kind         genea_media_kind not null default 'photo',
  storage_path text not null,            -- caminho no bucket `genea-media`
  title        text,
  description  text,
  taken_on     date,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists genea_media_person_idx on genea_media(person_id);
create index if not exists genea_media_tree_idx on genea_media(tree_id);

-- Compartilhamento por link seguro (somente leitura)
create table if not exists genea_share_links (
  token        text primary key default encode(gen_random_bytes(16), 'hex'),
  tree_id      uuid not null references genea_trees(id) on delete cascade,
  created_by   uuid not null references auth.users(id) on delete cascade,
  expires_at   timestamptz,
  revoked      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists genea_share_tree_idx on genea_share_links(tree_id);

-- Log de auditoria
create table if not exists genea_audit_log (
  id         bigint generated always as identity primary key,
  tree_id    uuid,
  actor_id   uuid,
  action     text not null,             -- insert | update | delete
  entity     text not null,             -- people | unions | media | tree | member
  entity_id  text,
  summary    text,
  diff       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists genea_audit_tree_idx on genea_audit_log(tree_id, created_at desc);

-- ---------------------------------------------------------------------------
-- FUNÇÕES AUXILIARES (SECURITY DEFINER evita recursão de RLS)
-- ---------------------------------------------------------------------------
create or replace function genea_is_member(p_tree uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from genea_members m where m.tree_id = p_tree and m.user_id = auth.uid()
  );
$$;

create or replace function genea_can_edit(p_tree uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from genea_members m
    where m.tree_id = p_tree and m.user_id = auth.uid()
      and m.role in ('admin','editor')
  );
$$;

create or replace function genea_is_admin(p_tree uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from genea_members m
    where m.tree_id = p_tree and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

-- Cria a árvore e adiciona o criador como admin (transacional)
create or replace function genea_create_tree(p_name text, p_description text default null)
returns genea_trees language plpgsql security definer set search_path = public as $$
declare t genea_trees;
begin
  insert into genea_trees(name, description, created_by)
  values (p_name, coalesce(p_description, ''), auth.uid())
  returning * into t;
  insert into genea_members(tree_id, user_id, role) values (t.id, auth.uid(), 'admin');
  return t;
end;
$$;

-- updated_at automático
create or replace function genea_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_people_touch on genea_people;
create trigger trg_people_touch before update on genea_people
  for each row execute function genea_touch_updated_at();
drop trigger if exists trg_trees_touch on genea_trees;
create trigger trg_trees_touch before update on genea_trees
  for each row execute function genea_touch_updated_at();

-- Auditoria genérica
create or replace function genea_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tree uuid; v_id text; v_summary text;
begin
  if (tg_op = 'DELETE') then
    v_tree := old.tree_id; v_id := old.id::text;
  else
    v_tree := new.tree_id; v_id := new.id::text;
  end if;
  v_summary := tg_table_name || ' ' || lower(tg_op);
  insert into genea_audit_log(tree_id, actor_id, action, entity, entity_id, summary, diff)
  values (
    v_tree, auth.uid(), lower(tg_op),
    replace(tg_table_name, 'genea_', ''), v_id, v_summary,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  if (tg_op = 'DELETE') then return old; else return new; end if;
end;
$$;

drop trigger if exists trg_people_audit on genea_people;
create trigger trg_people_audit after insert or update or delete on genea_people
  for each row execute function genea_audit();
drop trigger if exists trg_unions_audit on genea_unions;
create trigger trg_unions_audit after insert or update or delete on genea_unions
  for each row execute function genea_audit();

-- ---------------------------------------------------------------------------
-- RPC: leitura pública de árvore compartilhada (anon) via token
-- ---------------------------------------------------------------------------
create or replace function genea_shared_tree(p_token text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare v_tree uuid; result jsonb;
begin
  select tree_id into v_tree from genea_share_links
   where token = p_token and revoked = false
     and (expires_at is null or expires_at > now());
  if v_tree is null then return null; end if;

  select jsonb_build_object(
    'tree',   (select to_jsonb(t) from genea_trees t where t.id = v_tree),
    'people', coalesce((select jsonb_agg(to_jsonb(p)) from genea_people p where p.tree_id = v_tree), '[]'::jsonb),
    'unions', coalesce((select jsonb_agg(to_jsonb(u)) from genea_unions u where u.tree_id = v_tree), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
grant execute on function genea_shared_tree(text) to anon, authenticated;
grant execute on function genea_create_tree(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- ESTATÍSTICAS (dashboard)
-- ---------------------------------------------------------------------------
create or replace function genea_tree_stats(p_tree uuid)
returns jsonb language sql security definer stable set search_path = public as $$
  select case when not genea_is_member(p_tree) then null else jsonb_build_object(
    'people',       (select count(*) from genea_people where tree_id = p_tree),
    'living',       (select count(*) from genea_people where tree_id = p_tree and is_living),
    'deceased',     (select count(*) from genea_people where tree_id = p_tree and not is_living),
    'unions',       (select count(*) from genea_unions where tree_id = p_tree),
    'photos',       (select count(*) from genea_media where tree_id = p_tree and kind = 'photo'),
    'documents',    (select count(*) from genea_media where tree_id = p_tree and kind = 'document'),
    'surnames',     (select coalesce(jsonb_agg(s), '[]'::jsonb) from (
                        select last_name as name, count(*) as total
                        from genea_people
                        where tree_id = p_tree and coalesce(last_name,'') <> ''
                        group by last_name order by total desc limit 10
                     ) s),
    'birth_decades',(select coalesce(jsonb_agg(d), '[]'::jsonb) from (
                        select (extract(year from birth_date)::int / 10 * 10) as decade, count(*) as total
                        from genea_people
                        where tree_id = p_tree and birth_date is not null
                        group by decade order by decade
                     ) d)
  ) end;
$$;
grant execute on function genea_tree_stats(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table genea_trees       enable row level security;
alter table genea_members     enable row level security;
alter table genea_people      enable row level security;
alter table genea_unions      enable row level security;
alter table genea_media       enable row level security;
alter table genea_share_links enable row level security;
alter table genea_audit_log   enable row level security;

-- TREES
drop policy if exists trees_select on genea_trees;
create policy trees_select on genea_trees for select using (genea_is_member(id));
drop policy if exists trees_update on genea_trees;
create policy trees_update on genea_trees for update using (genea_is_admin(id));
drop policy if exists trees_delete on genea_trees;
create policy trees_delete on genea_trees for delete using (created_by = auth.uid());
-- inserção é feita via genea_create_tree(); permitimos também insert direto do dono
drop policy if exists trees_insert on genea_trees;
create policy trees_insert on genea_trees for insert with check (created_by = auth.uid());

-- MEMBERS
drop policy if exists members_select on genea_members;
create policy members_select on genea_members for select using (genea_is_member(tree_id));
drop policy if exists members_admin_all on genea_members;
create policy members_admin_all on genea_members for all
  using (genea_is_admin(tree_id)) with check (genea_is_admin(tree_id));

-- PEOPLE
drop policy if exists people_select on genea_people;
create policy people_select on genea_people for select using (genea_is_member(tree_id));
drop policy if exists people_write on genea_people;
create policy people_write on genea_people for all
  using (genea_can_edit(tree_id)) with check (genea_can_edit(tree_id));

-- UNIONS
drop policy if exists unions_select on genea_unions;
create policy unions_select on genea_unions for select using (genea_is_member(tree_id));
drop policy if exists unions_write on genea_unions;
create policy unions_write on genea_unions for all
  using (genea_can_edit(tree_id)) with check (genea_can_edit(tree_id));

-- MEDIA
drop policy if exists media_select on genea_media;
create policy media_select on genea_media for select using (genea_is_member(tree_id));
drop policy if exists media_write on genea_media;
create policy media_write on genea_media for all
  using (genea_can_edit(tree_id)) with check (genea_can_edit(tree_id));

-- SHARE LINKS (somente admin gerencia)
drop policy if exists share_admin on genea_share_links;
create policy share_admin on genea_share_links for all
  using (genea_is_admin(tree_id)) with check (genea_is_admin(tree_id));

-- AUDIT (somente admin lê)
drop policy if exists audit_select on genea_audit_log;
create policy audit_select on genea_audit_log for select using (genea_is_admin(tree_id));

-- ---------------------------------------------------------------------------
-- STORAGE (bucket privado para fotos/documentos)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('genea-media', 'genea-media', false)
on conflict (id) do nothing;

-- caminho dos arquivos: <tree_id>/<...>. Acesso liberado a membros da árvore.
drop policy if exists genea_media_read on storage.objects;
create policy genea_media_read on storage.objects for select
  using (bucket_id = 'genea-media' and genea_is_member((storage.foldername(name))[1]::uuid));

drop policy if exists genea_media_write on storage.objects;
create policy genea_media_write on storage.objects for insert
  with check (bucket_id = 'genea-media' and genea_can_edit((storage.foldername(name))[1]::uuid));

drop policy if exists genea_media_delete on storage.objects;
create policy genea_media_delete on storage.objects for delete
  using (bucket_id = 'genea-media' and genea_can_edit((storage.foldername(name))[1]::uuid));
