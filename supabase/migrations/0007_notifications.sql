-- ============================================================================
-- ÁRVORE GENEALÓGICA — FLIVE  ·  Central de notificações internas
-- Solicitações de acesso (editar) chegam como notificação ao admin (aprovação
-- fácil); o membro pendente pode reenviar o pedido; aprovação notifica a pessoa.
-- ============================================================================

create table if not exists genea_notifications (
  id          bigint generated always as identity primary key,
  tree_id     uuid references genea_trees(id) on delete cascade,
  recipient   uuid not null references auth.users(id) on delete cascade,
  kind        text not null,            -- access_request | access_approved | info
  actor       uuid references auth.users(id) on delete set null,
  actor_email text,
  message     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists genea_notif_recipient_idx
  on genea_notifications(recipient, read, created_at desc);

alter table genea_notifications enable row level security;
drop policy if exists notif_select on genea_notifications;
create policy notif_select on genea_notifications for select using (recipient = auth.uid());
drop policy if exists notif_update on genea_notifications;
create policy notif_update on genea_notifications for update
  using (recipient = auth.uid()) with check (recipient = auth.uid());

-- Notifica todos os admins (papel admin + dono) da árvore.
create or replace function genea_notify_admins(p_tree uuid, p_kind text, p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor uuid; v_email text;
begin
  v_actor := auth.uid();
  select email into v_email from auth.users where id = v_actor;
  insert into genea_notifications(tree_id, recipient, kind, actor, actor_email, message)
  select p_tree, admin_id, p_kind, v_actor, v_email, p_message
  from (
    select user_id as admin_id from genea_members where tree_id = p_tree and role = 'admin'
    union
    select created_by from genea_trees where id = p_tree
  ) a
  where admin_id is not null
    and admin_id <> coalesce(v_actor, '00000000-0000-0000-0000-000000000000'::uuid);
end; $$;

-- genea_join_tree passa a notificar admins ao solicitar acesso.
create or replace function genea_join_tree(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tree uuid; v_uid uuid; v_email text; v_name text; v_existing genea_role; v_treename text;
begin
  v_uid := auth.uid();
  if v_uid is null then return jsonb_build_object('status','unauthenticated'); end if;
  select tree_id into v_tree from genea_invite_links
   where token = p_token and revoked = false and (expires_at is null or expires_at > now());
  if v_tree is null then return jsonb_build_object('status','invalid'); end if;
  select name into v_treename from genea_trees where id = v_tree;
  select role into v_existing from genea_members where tree_id = v_tree and user_id = v_uid;
  if v_existing is not null then
    return jsonb_build_object('status', case when v_existing='pending' then 'pending' else 'member' end,
                              'tree_id', v_tree, 'tree_name', v_treename, 'role', v_existing);
  end if;
  select email, coalesce(raw_user_meta_data->>'name', email) into v_email, v_name from auth.users where id = v_uid;
  insert into genea_members(tree_id, user_id, role, email, display_name)
  values (v_tree, v_uid, 'pending', v_email, v_name);
  perform genea_notify_admins(v_tree, 'access_request',
    coalesce(v_name, v_email, 'Alguém') || ' solicitou acesso para editar ' || coalesce(v_treename,'a árvore'));
  return jsonb_build_object('status','pending','tree_id',v_tree,'tree_name',v_treename);
end; $$;

-- Membro pendente reenvia o pedido de aprovação.
create or replace function genea_request_approval(p_tree uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_role genea_role; v_email text; v_name text; v_treename text;
begin
  v_uid := auth.uid();
  if v_uid is null then return jsonb_build_object('status','unauthenticated'); end if;
  select role into v_role from genea_members where tree_id = p_tree and user_id = v_uid;
  if v_role is null then return jsonb_build_object('status','not_member'); end if;
  select email, coalesce(raw_user_meta_data->>'name', email) into v_email, v_name from auth.users where id = v_uid;
  select name into v_treename from genea_trees where id = p_tree;
  perform genea_notify_admins(p_tree, 'access_request',
    coalesce(v_name, v_email, 'Alguém') || ' solicitou aprovação de acesso em ' || coalesce(v_treename,'a árvore'));
  return jsonb_build_object('status','ok');
end; $$;

-- Admin aprova membro (vira editor/gestor) e notifica a pessoa.
create or replace function genea_approve_member(p_tree uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_treename text;
begin
  if not genea_is_admin(p_tree) then raise exception 'forbidden'; end if;
  update genea_members set role = 'editor' where tree_id = p_tree and user_id = p_user;
  select name into v_treename from genea_trees where id = p_tree;
  insert into genea_notifications(tree_id, recipient, kind, actor, message)
  values (p_tree, p_user, 'access_approved', auth.uid(),
          'Seu acesso para editar ' || coalesce(v_treename,'a árvore') || ' foi aprovado! Você já pode editar.');
end; $$;

revoke execute on function genea_notify_admins(uuid, text, text) from public, anon;
grant  execute on function genea_request_approval(uuid) to authenticated;
grant  execute on function genea_approve_member(uuid, uuid) to authenticated;
revoke execute on function genea_request_approval(uuid) from anon;
revoke execute on function genea_approve_member(uuid, uuid) from anon;
