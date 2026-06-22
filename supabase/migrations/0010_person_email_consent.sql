-- ============================================================================
-- ÁRVORE GENEALÓGICA — FLIVE  ·  E-mail da pessoa + consentimento do usuário
-- Ao incluir/editar uma pessoa com e-mail: se já existe um usuário com aquele
-- e-mail, ele é notificado e precisa CONFIRMAR que aceita participar da árvore.
-- Quem criar conta depois com esse e-mail também verá o pedido de consentimento.
-- ============================================================================

alter table genea_people add column if not exists email text;

create table if not exists genea_person_consents (
  id          bigint generated always as identity primary key,
  tree_id     uuid not null references genea_trees(id) on delete cascade,
  person_id   uuid not null references genea_people(id) on delete cascade,
  email       text not null,
  user_id     uuid references auth.users(id) on delete set null,
  status      text not null default 'pending',  -- pending | accepted | declined
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  unique (person_id)
);
create index if not exists genea_consent_email_idx on genea_person_consents(lower(email), status);

alter table genea_person_consents enable row level security;
drop policy if exists consent_select on genea_person_consents;
create policy consent_select on genea_person_consents for select
  using (
    user_id = auth.uid()
    or lower(email) = lower((select email from auth.users where id = auth.uid()))
    or genea_is_member(tree_id)
  );

-- Anuncia uma pessoa: cria/atualiza o consentimento pendente e, se houver
-- usuário com aquele e-mail, o notifica.
create or replace function genea_announce_person(p_person uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tree uuid; v_email text; v_name text; v_treename text; v_uid uuid;
begin
  select tree_id, lower(nullif(btrim(email), '')),
         btrim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))
    into v_tree, v_email, v_name from genea_people where id = p_person;
  if v_email is null then return jsonb_build_object('status','no_email'); end if;
  if not genea_can_edit(v_tree) then raise exception 'forbidden'; end if;
  select id into v_uid from auth.users where lower(email) = v_email limit 1;
  select name into v_treename from genea_trees where id = v_tree;

  insert into genea_person_consents(tree_id, person_id, email, user_id)
  values (v_tree, p_person, v_email, v_uid)
  on conflict (person_id) do update
    set email = excluded.email,
        user_id = coalesce(genea_person_consents.user_id, excluded.user_id);

  if v_uid is not null and v_uid <> auth.uid() then
    insert into genea_notifications(tree_id, recipient, kind, actor, message)
    values (v_tree, v_uid, 'consent_request', auth.uid(),
      'Você foi incluído(a) na árvore "' || coalesce(v_treename,'') || '" como ' ||
      coalesce(v_name,'') || '. Confirme se aceita participar.');
  end if;
  return jsonb_build_object('status',
    case when v_uid is not null then 'user_notified' else 'pending_email' end);
end; $$;

-- Consentimentos pendentes do usuário atual (por user_id ou e-mail).
create or replace function genea_my_pending_consents()
returns table(id bigint, tree_id uuid, tree_name text, person_id uuid, person_name text)
language sql security definer stable set search_path = public as $$
  select c.id, c.tree_id, t.name,
         c.person_id, btrim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))
  from genea_person_consents c
  join genea_trees t on t.id = c.tree_id
  join genea_people p on p.id = c.person_id
  where c.status = 'pending'
    and (c.user_id = auth.uid()
         or lower(c.email) = lower((select email from auth.users where id = auth.uid())));
$$;

-- Usuário aceita ou recusa participar.
create or replace function genea_resolve_consent(p_id bigint, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c genea_person_consents; v_uid uuid; v_my_email text; v_treename text;
begin
  v_uid := auth.uid();
  select email into v_my_email from auth.users where id = v_uid;
  select * into c from genea_person_consents where id = p_id;
  if c.id is null then return jsonb_build_object('status','not_found'); end if;
  if not (c.user_id = v_uid or lower(c.email) = lower(v_my_email)) then raise exception 'forbidden'; end if;
  if c.status <> 'pending' then return jsonb_build_object('status','already'); end if;
  select name into v_treename from genea_trees where id = c.tree_id;

  update genea_person_consents
    set status = case when p_accept then 'accepted' else 'declined' end,
        user_id = v_uid, resolved_at = now()
    where id = p_id;

  if p_accept then
    insert into genea_members(tree_id, user_id, role, email)
    values (c.tree_id, v_uid, 'viewer', v_my_email)
    on conflict (tree_id, user_id) do nothing;
  end if;

  insert into genea_notifications(tree_id, recipient, kind, actor, message)
  select c.tree_id, m.user_id, 'consent_resolved', v_uid,
         coalesce(v_my_email,'Alguém') ||
         case when p_accept then ' aceitou participar da árvore "' else ' recusou participar da árvore "' end ||
         coalesce(v_treename,'') || '".'
  from genea_members m where m.tree_id = c.tree_id and m.role = 'admin' and m.user_id <> v_uid;

  return jsonb_build_object('status', case when p_accept then 'accepted' else 'declined' end);
end; $$;

revoke execute on function genea_announce_person(uuid) from public, anon;
revoke execute on function genea_resolve_consent(bigint, boolean) from public, anon;
grant execute on function genea_announce_person(uuid) to authenticated;
grant execute on function genea_my_pending_consents() to authenticated;
grant execute on function genea_resolve_consent(bigint, boolean) to authenticated;
