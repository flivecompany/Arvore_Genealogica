-- ============================================================================
-- ÁRVORE GENEALÓGICA — FLIVE  ·  Superadmin (plataforma)
-- Ambiente acima das árvores: configurações globais e métricas da plataforma.
-- O e-mail flivecompany@gmail.com é semeado como superadmin inicial.
-- ============================================================================

create table if not exists genea_superadmins (
  email      text primary key,
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into genea_superadmins(email) values ('flivecompany@gmail.com')
  on conflict (email) do nothing;

-- É superadmin? (por e-mail ou user_id do usuário atual)
create or replace function genea_is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from genea_superadmins s
    where s.user_id = auth.uid()
       or lower(s.email) = lower((select email from auth.users where id = auth.uid()))
  );
$$;

-- Configurações globais da plataforma (linha única)
create table if not exists genea_platform_settings (
  id             boolean primary key default true,
  platform_name  text not null default 'Árvore Genealógica · Flive',
  support_email  text,
  announcement   text,
  allow_signups  boolean not null default true,
  updated_at     timestamptz not null default now(),
  updated_by     uuid,
  constraint genea_settings_singleton check (id)
);
insert into genea_platform_settings(id) values (true) on conflict (id) do nothing;

alter table genea_superadmins enable row level security;
alter table genea_platform_settings enable row level security;

-- Apenas superadmin enxerga/gerencia a lista de superadmins.
drop policy if exists superadmin_all on genea_superadmins;
create policy superadmin_all on genea_superadmins for all
  using (genea_is_superadmin()) with check (genea_is_superadmin());

-- Configurações: leitura e escrita só por superadmin (uso geral via RPC pública).
drop policy if exists settings_super on genea_platform_settings;
create policy settings_super on genea_platform_settings for all
  using (genea_is_superadmin()) with check (genea_is_superadmin());

-- Configurações públicas seguras (nome + aviso) — visíveis a qualquer usuário.
create or replace function genea_public_settings()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'platform_name', platform_name,
    'announcement', announcement
  ) from genea_platform_settings where id = true;
$$;

-- Atualiza configurações (somente superadmin).
create or replace function genea_update_settings(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not genea_is_superadmin() then raise exception 'forbidden'; end if;
  update genea_platform_settings set
    platform_name = coalesce(nullif(btrim(p->>'platform_name'),''), platform_name),
    support_email = nullif(btrim(p->>'support_email'),''),
    announcement  = nullif(btrim(p->>'announcement'),''),
    allow_signups = coalesce((p->>'allow_signups')::boolean, allow_signups),
    updated_at = now(), updated_by = auth.uid()
  where id = true;
  return (select to_jsonb(s) from genea_platform_settings s where id = true);
end; $$;

-- Métricas globais da plataforma (somente superadmin).
create or replace function genea_platform_stats()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not genea_is_superadmin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'trees',       (select count(*) from genea_trees),
    'people',      (select count(*) from genea_people),
    'unions',      (select count(*) from genea_unions),
    'users',       (select count(distinct user_id) from genea_members),
    'media',       (select count(*) from genea_media),
    'pending',     (select count(*) from genea_members where role = 'pending'),
    'share_links', (select count(*) from genea_share_links where coalesce(revoked,false) = false)
  );
end; $$;

-- Concede/revoga superadmin a um e-mail (somente superadmin).
create or replace function genea_set_superadmin(p_email text, p_grant boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not genea_is_superadmin() then raise exception 'forbidden'; end if;
  if p_grant then
    insert into genea_superadmins(email,user_id)
    values (lower(btrim(p_email)),
            (select id from auth.users where lower(email)=lower(btrim(p_email)) limit 1))
    on conflict (email) do nothing;
  else
    delete from genea_superadmins where lower(email) = lower(btrim(p_email));
  end if;
end; $$;

revoke execute on function genea_update_settings(jsonb) from public, anon;
revoke execute on function genea_platform_stats() from public, anon;
revoke execute on function genea_set_superadmin(text, boolean) from public, anon;
grant execute on function genea_is_superadmin() to authenticated, anon;
grant execute on function genea_public_settings() to authenticated, anon;
grant execute on function genea_update_settings(jsonb) to authenticated;
grant execute on function genea_platform_stats() to authenticated;
grant execute on function genea_set_superadmin(text, boolean) to authenticated;
