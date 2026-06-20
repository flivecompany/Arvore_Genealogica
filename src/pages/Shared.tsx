import { lazy, Suspense, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Lock, Download } from "lucide-react";
const FamilyTree = lazy(() => import("@/components/FamilyTree"));
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { fetchSharedTree } from "@/lib/people";
import { exportPdf } from "@/lib/exporters";
import type { Person, Union, Tree } from "@/integrations/supabase/types";

export default function Shared() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "ok" | "invalid">("loading");
  const [tree, setTree] = useState<Tree | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);

  useEffect(() => {
    if (!token) return;
    fetchSharedTree(token)
      .then((data) => {
        if (!data) return setState("invalid");
        setTree(data.tree);
        setPeople(data.people ?? []);
        setUnions(data.unions ?? []);
        setState("ok");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  if (state === "loading") {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="min-h-screen grid place-items-center text-center px-4">
        <div className="space-y-3">
          <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold">Link inválido ou expirado</h1>
          <p className="text-muted-foreground">Solicite um novo link de compartilhamento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-subtle">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <Logo withText={false} />
            <div>
              <div className="font-semibold">{tree?.name}</div>
              <div className="text-xs text-muted-foreground">Visualização compartilhada (somente leitura)</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const el = document.querySelector(".f3") as HTMLElement | null;
              if (el) exportPdf(el, tree?.name ?? "Árvore");
            }}
          >
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        {people.length > 0 ? (
          <Suspense fallback={<div className="h-full grid place-items-center text-muted-foreground">Carregando organograma...</div>}>
            <FamilyTree people={people} unions={unions} className="h-full" />
          </Suspense>
        ) : (
          <div className="h-full grid place-items-center text-muted-foreground">
            Esta árvore ainda não tem pessoas cadastradas.
          </div>
        )}
      </div>
    </div>
  );
}
