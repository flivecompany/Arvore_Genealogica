import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listPeople, listUnions } from "@/lib/people";
import type { Person, Union } from "@/integrations/supabase/types";

export function useTreeData(treeId: string | undefined) {
  const qc = useQueryClient();

  const peopleQuery = useQuery({
    queryKey: ["people", treeId],
    queryFn: () => listPeople(treeId!),
    enabled: !!treeId,
  });

  const unionsQuery = useQuery({
    queryKey: ["unions", treeId],
    queryFn: () => listUnions(treeId!),
    enabled: !!treeId,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["people", treeId] });
    qc.invalidateQueries({ queryKey: ["unions", treeId] });
    qc.invalidateQueries({ queryKey: ["stats", treeId] });
  };

  return {
    people: (peopleQuery.data ?? []) as Person[],
    unions: (unionsQuery.data ?? []) as Union[],
    isLoading: peopleQuery.isLoading || unionsQuery.isLoading,
    refresh,
  };
}
