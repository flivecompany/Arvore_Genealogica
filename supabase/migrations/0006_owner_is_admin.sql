-- ============================================================================
-- ÁRVORE GENEALÓGICA — FLIVE
-- O dono da árvore (genea_trees.created_by) é sempre admin/editor, mesmo que
-- seu papel em genea_members tenha sido alterado. Evita o dono ficar travado.
-- ============================================================================
create or replace function genea_is_admin(p_tree uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from genea_members m
    where m.tree_id = p_tree and m.user_id = auth.uid() and m.role = 'admin'
  ) or exists (
    select 1 from genea_trees t where t.id = p_tree and t.created_by = auth.uid()
  );
$$;

create or replace function genea_can_edit(p_tree uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from genea_members m
    where m.tree_id = p_tree and m.user_id = auth.uid() and m.role in ('admin','editor')
  ) or exists (
    select 1 from genea_trees t where t.id = p_tree and t.created_by = auth.uid()
  );
$$;

-- Garante o dono como admin nas árvores que criou (corrige dados existentes).
update genea_members m
set role = 'admin'
from genea_trees t
where m.tree_id = t.id and m.user_id = t.created_by and m.role <> 'admin';
