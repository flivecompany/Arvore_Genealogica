-- ============================================================================
-- ÁRVORE GENEALÓGICA — FLIVE  ·  Estatísticas de acesso à plataforma
-- Registra acessos (com throttle) e expõe métricas SOMENTE para superadmin.
-- ============================================================================

create table if not exists genea_access_log (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  email       text,
  path        text,
  occurred_at timestamptz not null default now()
);
create index if not exists genea_access_occurred_idx on genea_access_log(occurred_at);
create index if not exists genea_access_user_idx on genea_access_log(user_id, occurred_at);

alter table genea_access_log enable row level security;
-- Leitura apenas para superadmin (o uso normal é via RPC agregada).
drop policy if exists access_log_super_read on genea_access_log;
create policy access_log_super_read on genea_access_log for select
  using (genea_is_superadmin());

-- Registra um acesso do usuário atual, com throttle de 15 min.
create or replace function genea_record_access(p_path text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if auth.uid() is null then return; end if;
  if exists (
    select 1 from genea_access_log
    where user_id = auth.uid() and occurred_at > now() - interval '15 minutes'
  ) then
    return;
  end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into genea_access_log(user_id, email, path)
  values (auth.uid(), v_email, nullif(btrim(p_path), ''));
end; $$;

-- Estatísticas de acesso (somente superadmin).
create or replace function genea_access_stats(p_days int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_days int := greatest(1, least(coalesce(p_days, 30), 365));
begin
  if not genea_is_superadmin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'total',        (select count(*) from genea_access_log),
    'today',        (select count(*) from genea_access_log where occurred_at >= date_trunc('day', now())),
    'last7',        (select count(*) from genea_access_log where occurred_at >= now() - interval '7 days'),
    'last30',       (select count(*) from genea_access_log where occurred_at >= now() - interval '30 days'),
    'unique_total', (select count(distinct user_id) from genea_access_log),
    'unique_today', (select count(distinct user_id) from genea_access_log where occurred_at >= date_trunc('day', now())),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
                'day', to_char(d.day, 'YYYY-MM-DD'),
                'accesses', coalesce(a.accesses, 0),
                'users', coalesce(a.users, 0)) order by d.day), '[]'::jsonb)
      from generate_series(date_trunc('day', now()) - ((v_days - 1) || ' days')::interval,
                           date_trunc('day', now()), interval '1 day') as d(day)
      left join (
        select date_trunc('day', occurred_at) as day,
               count(*) as accesses, count(distinct user_id) as users
        from genea_access_log
        where occurred_at >= date_trunc('day', now()) - ((v_days - 1) || ' days')::interval
        group by 1
      ) a on a.day = d.day
    ),
    'top_users', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select email, count(*) as accesses, max(occurred_at) as last_at
        from genea_access_log
        where occurred_at >= now() - (v_days || ' days')::interval
        group by email
        order by accesses desc
        limit 10
      ) t
    )
  );
end; $$;

revoke execute on function genea_access_stats(int) from public, anon;
grant execute on function genea_record_access(text) to authenticated;
grant execute on function genea_access_stats(int) to authenticated;
