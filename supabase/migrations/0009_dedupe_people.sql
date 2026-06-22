-- ============================================================================
-- ÁRVORE GENEALÓGICA — FLIVE  ·  Limpeza única de pessoas duplicadas
-- Mescla pessoas com o MESMO nome dentro da MESMA árvore: mantém a mais antiga,
-- repõe vínculos (pais/cônjuges/mídia) e remove as duplicatas.
-- ============================================================================
do $$
declare g record; keeper uuid; dup uuid;
begin
  for g in
    select tree_id, array_agg(id order by created_at, id) as ids
    from genea_people
    where btrim(coalesce(first_name,'')||' '||coalesce(last_name,'')) <> ''
    group by tree_id, lower(btrim(coalesce(first_name,'')||' '||coalesce(last_name,'')))
    having count(*) > 1
  loop
    keeper := g.ids[1];
    foreach dup in array g.ids[2:array_length(g.ids,1)] loop
      update genea_people set father_id = keeper where father_id = dup;
      update genea_people set mother_id = keeper where mother_id = dup;
      update genea_unions  set partner1_id = keeper where partner1_id = dup;
      update genea_unions  set partner2_id = keeper where partner2_id = dup;
      update genea_media   set person_id  = keeper where person_id  = dup;
      delete from genea_people where id = dup;
    end loop;
  end loop;
end $$;

-- pessoa não pode ser pai e mãe ao mesmo tempo (resíduo de duplicados)
update genea_people set mother_id = null where father_id is not null and father_id = mother_id;

-- remove uniões degeneradas e duplicadas
delete from genea_unions where partner1_id = partner2_id;
delete from genea_unions u using genea_unions u2
 where u.id > u2.id
   and least(u.partner1_id, u.partner2_id)   = least(u2.partner1_id, u2.partner2_id)
   and greatest(u.partner1_id, u.partner2_id) = greatest(u2.partner1_id, u2.partner2_id);
