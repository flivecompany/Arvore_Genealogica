import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tree, MemberRole } from "@/integrations/supabase/types";
import { listMyTrees, createTree } from "@/lib/people";
import { useAuth } from "./useAuth";

interface TreeContextType {
  trees: Tree[];
  activeTree: Tree | null;
  role: MemberRole | null;
  canEdit: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  setActiveTree: (id: string) => void;
  refreshTrees: () => Promise<void>;
  createNewTree: (name: string, description?: string) => Promise<Tree>;
}

const TreeContext = createContext<TreeContextType | undefined>(undefined);
const ACTIVE_KEY = "genea.activeTree";

export function TreeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [trees, setTrees] = useState<Tree[]>([]);
  const [activeTree, setActive] = useState<Tree | null>(null);
  const [role, setRole] = useState<MemberRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRole = useCallback(
    async (treeId: string, userId: string) => {
      const { data } = await supabase
        .from("genea_members")
        .select("role")
        .eq("tree_id", treeId)
        .eq("user_id", userId)
        .maybeSingle();
      setRole((data?.role as MemberRole) ?? null);
    },
    []
  );

  const refreshTrees = useCallback(async () => {
    if (!user) {
      setTrees([]);
      setActive(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const list = await listMyTrees();
      setTrees(list);
      const saved = localStorage.getItem(ACTIVE_KEY);
      const next = list.find((t) => t.id === saved) ?? list[0] ?? null;
      setActive(next);
      if (next) {
        localStorage.setItem(ACTIVE_KEY, next.id);
        await loadRole(next.id, user.id);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, loadRole]);

  useEffect(() => {
    refreshTrees();
  }, [refreshTrees]);

  const setActiveTree = useCallback(
    (id: string) => {
      const t = trees.find((x) => x.id === id) ?? null;
      setActive(t);
      if (t && user) {
        localStorage.setItem(ACTIVE_KEY, t.id);
        loadRole(t.id, user.id);
      }
    },
    [trees, user, loadRole]
  );

  const createNewTree = useCallback(
    async (name: string, description?: string) => {
      const t = await createTree(name, description);
      await refreshTrees();
      setActiveTree(t.id);
      return t;
    },
    [refreshTrees, setActiveTree]
  );

  return (
    <TreeContext.Provider
      value={{
        trees,
        activeTree,
        role,
        canEdit: role === "admin" || role === "editor",
        isAdmin: role === "admin",
        isLoading,
        setActiveTree,
        refreshTrees,
        createNewTree,
      }}
    >
      {children}
    </TreeContext.Provider>
  );
}

export function useTree() {
  const ctx = useContext(TreeContext);
  if (ctx === undefined)
    throw new Error("useTree must be used within a TreeProvider");
  return ctx;
}
