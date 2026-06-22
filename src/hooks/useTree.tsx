import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
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
  const provisioningRef = useRef(false);

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
      let list = await listMyTrees();
      // Provisiona automaticamente a primeira árvore para um usuário novo,
      // garantindo que sempre haja uma árvore ativa (e o usuário como admin).
      if (list.length === 0 && !provisioningRef.current) {
        provisioningRef.current = true;
        try {
          const created = await createTree("Minha Família");
          list = [created];
        } catch (e) {
          if (import.meta.env.DEV) console.error("auto-provision tree failed", e);
        }
      }
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

  // Reaplica o papel quando a aba volta ao foco (ex.: logo após o admin aprovar
  // o acesso), habilitando a edição sem precisar recarregar a página.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && user && activeTree) {
        loadRole(activeTree.id, user.id);
      }
    }
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, activeTree, loadRole]);

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

  // O dono da árvore (created_by) sempre tem permissão de edição/admin, mesmo
  // que a leitura do papel em genea_members ainda não tenha retornado.
  const isOwner = !!(activeTree && user && activeTree.created_by === user.id);

  return (
    <TreeContext.Provider
      value={{
        trees,
        activeTree,
        role,
        canEdit: role === "admin" || role === "editor" || isOwner,
        isAdmin: role === "admin" || isOwner,
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
