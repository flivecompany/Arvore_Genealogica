import { lazy, Suspense, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Lock, Download, Pencil } from "lucide-react";
const FamilyTree = lazy(() => import("@/components/FamilyTree"));
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Seo } from "@/components/Seo";
import { fetchSharedTree, requestEditAccess } from "@/lib/people";
import { exportPdf } from "@/lib/exporters";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Person, Union, Tree } from "@/integrations/supabase/types";

export default function Shared() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<"loading" | "ok" | "invalid">("loading");
  const [tree, setTree] = useState<Tree | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);
  const [asking, setAsking] = useState(false);

  async function askEdit() {
    if (!token) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/compartilhar/${token}`)}`);
      return;
    }
    setAsking(true);
    try {
      const r = await requestEditAccess(token);
      if (r.status === "pending")
        toast({ title: "Pedido enviado!", description: "Um administrador vai aprovar seu acesso de edição." });
      else if (r.status === "member" || r.status === "joined")
        toast({ title: "Você já tem acesso", description: "Abra a árvore para editar." });
      else
        toast({ title: "Não foi possível solicitar", description: "Link inválido ou expirado.", variant: "destructive" });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAsking(false);
    }
  }

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
      <Seo title={`${tree?.name ?? "Árvore"} · Visualização compartilhada`} noindex />
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <Logo withText={false} />
            <div>
              <div className="font-semibold">{tree?.name}</div>
              <div className="text-xs text-muted-foreground">Visualização compartilhada (somente leitura)</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={askEdit} disabled={asking}>
              <Pencil className="h-4 w-4 mr-1" /> Solicitar acesso para editar
            </Button>
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
