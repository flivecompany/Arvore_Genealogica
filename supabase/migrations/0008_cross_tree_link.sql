-- ============================================================================
-- ÁRVORE GENEALÓGICA — FLIVE  ·  Vincular pessoas entre árvores (com consentimento)
-- Busca global por NOME (privacidade: só o nome é exposto) → pedido de inclusão
-- → qualquer membro da árvore de origem aprova → cópia dos dados básicos é
-- criada na árvore solicitante. Só aparece após aprovação.
-- ============================================================================

-- Busca pessoas em OUTRAS árvores (onde o solicitante NÃO é membro). Só nome.
create or replace function genea_search_people_global(p_query text)
returns table(person_id uuid, full_name text)
language sql security definer stable set search_path = public as $$
  select p.id,
         btrim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) as full_name
  from genea_people p
  where length(btrim(coalesce(p_query,''))) >= 3
    and (coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) ilike '%' || btrim(p_query) || '%'
    and not exists (
      select 1 from genea_members m where m.tree_id = p.tree_id and m.user_id = auth.uid()
    )
  order by full_name
  limit 20;
$$;
revoke execute on function genea_search_people_global(text) from public, anon;
grant execute on function genea_search_people_global(text) to authenticated;

-- Pedidos de vínculo (inclusão de pessoa de outra árvore)
create table if not exists genea_link_requests (
  id                 bigint generated always as identity primary key,
  requester_tree_id  uuid not null references genea_trees(id) on delete cascade,
  requester_tree_name text,
  requester_user     uuid not null references auth.users(id) on delete cascade,
  requester_email    text,
  target_person_id   uuid not null references genea_people(id) on delete cascade,
  target_tree_id     uuid not null references genea_trees(id) on delete cascade,
  target_name        text,
  status             text not null default 'pending',  -- pending | approved | denied
  message            text,
  created_person_id  uuid references genea_people(id) on delete set null,
  resolved_by        uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  resolved_at        timestamptz
);
create index if not exists genea_linkreq_target_idx on genea_link_requests(target_tree_id, status);
create index if not exists genea_linkreq_requester_idx on genea_link_requests(requester_user);

alter table genea_link_requests enable row level security;
drop policy if exists linkreq_select on genea_link_requests;
create policy linkreq_select on genea_link_requests for select
  using (requester_user = auth.uid() or genea_is_member(target_tree_id));

-- Cria o pedido (solicitante precisa poder editar a própria árvore)
create or replace function genea_request_person_link(p_target_person uuid, p_requester_tree uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_target_tree uuid; v_target_name text; v_reqtree text; v_email text; v_dup int; v_id bigint;
begin
  v_uid := auth.uid();
  if v_uid is null then return jsonb_build_object('status','unauthenticated'); end if;
  if not genea_can_edit(p_requester_tree) then raise exception 'forbidden'; end if;
  select p.tree_id, btrim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,''))
    into v_target_tree, v_target_name from genea_people p where p.id = p_target_person;
  if v_target_tree is null then return jsonb_build_object('status','not_found'); end if;
  if v_target_tree = p_requester_tree then return jsonb_build_object('status','same_tree'); end if;
  select count(*) into v_dup from genea_link_requests
    where requester_tree_id = p_requester_tree and target_person_id = p_target_person and status = 'pending';
  if v_dup > 0 then return jsonb_build_object('status','already_requested'); end if;
  select name into v_reqtree from genea_trees where id = p_requester_tree;
  select email into v_email from auth.users where id = v_uid;
  insert into genea_link_requests(requester_tree_id, requester_tree_name, requester_user, requester_email,
                                  target_person_id, target_tree_id, target_name)
  values (p_requester_tree, v_reqtree, v_uid, v_email, p_target_person, v_target_tree, v_target_name)
  returning id into v_id;
  return jsonb_build_object('status','ok','request_id', v_id);
end; $$;
revoke execute on function genea_request_person_link(uuid, uuid) from public, anon;
grant execute on function genea_request_person_link(uuid, uuid) to authenticated;

-- Aprova/recusa o pedido (qualquer membro da árvore de origem)
create or replace function genea_resolve_link_request(p_request bigint, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r genea_link_requests; v_new uuid; v_uid uuid;
begin
  v_uid := auth.uid();
  select * into r from genea_link_requests where id = p_request;
  if r.id is null then return jsonb_build_object('status','not_found'); end if;
  if not genea_is_member(r.target_tree_id) then raise exception 'forbidden'; end if;
  if r.status <> 'pending' then return jsonb_build_object('status','already_resolved'); end if;

  if p_approve then
    insert into genea_people(tree_id, first_name, last_name, sex, birth_date, birth_date_text,
                             death_date, death_date_text, is_living, created_by)
    select r.requester_tree_id, p.first_name, p.last_name, p.sex, p.birth_date, p.birth_date_text,
           p.death_date, p.death_date_text, p.is_living, r.requester_user
    from genea_people p where p.id = r.target_person_id
    returning id into v_new;
    update genea_link_requests
      set status='approved', created_person_id=v_new, resolved_by=v_uid, resolved_at=now()
      where id = p_request;
    insert into genea_notifications(tree_id, recipient, kind, actor, message)
    values (r.requester_tree_id, r.requester_user, 'link_resolved', v_uid,
            coalesce(r.target_name,'A pessoa') || ' foi aprovada e adicionada à sua árvore "' || coalesce(r.requester_tree_name,'') || '".');
    return jsonb_build_object('status','approved','person_id',v_new);
  else
    update genea_link_requests
      set status='denied', resolved_by=v_uid, resolved_at=now()
      where id = p_request;
    insert into genea_notifications(tree_id, recipient, kind, actor, message)
    values (r.requester_tree_id, r.requester_user, 'link_resolved', v_uid,
            'Seu pedido para incluir ' || coalesce(r.target_name,'a pessoa') || ' não foi aprovado.');
    return jsonb_build_object('status','denied');
  end if;
end; $$;
revoke execute on function genea_resolve_link_request(bigint, boolean) from public, anon;
grant execute on function genea_resolve_link_request(bigint, boolean) to authenticated;
