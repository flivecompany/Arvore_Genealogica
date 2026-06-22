-- ============================================================================
-- ÁRVORE GENEALÓGICA — FLIVE  ·  RPC de entrada via convite
-- Em arquivo separado de 0004 para que o valor de enum 'pending' já esteja
-- commitado antes de ser usado em runtime.
-- ============================================================================

-- Convidado autenticado entra na árvore como 'pending' (aguardando aprovação).
create or replace function genea_join_tree(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_tree uuid; v_uid uuid; v_email text; v_name text;
  v_existing genea_role; v_treename text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  select tree_id into v_tree from genea_invite_links
   where token = p_token and revoked = false
     and (expires_at is null or expires_at > now());
  if v_tree is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  select name into v_treename from genea_trees where id = v_tree;
  select role into v_existing from genea_members where tree_id = v_tree and user_id = v_uid;

  if v_existing is not null then
    return jsonb_build_object(
      'status', case when v_existing = 'pending' then 'pending' else 'member' end,
      'tree_id', v_tree, 'tree_name', v_treename, 'role', v_existing
    );
  end if;

  select email, coalesce(raw_user_meta_data->>'name', email)
    into v_email, v_name from auth.users where id = v_uid;

  insert into genea_members(tree_id, user_id, role, email, display_name)
  values (v_tree, v_uid, 'pending', v_email, v_name);

  return jsonb_build_object('status', 'pending', 'tree_id', v_tree, 'tree_name', v_treename);
end;
$$;

revoke execute on function genea_join_tree(text) from public, anon;
grant execute on function genea_join_tree(text) to authenticated;
