import { lazy, Suspense, useMemo, useRef, useState } from "react";
import {
  UserPlus,
  Search,
  Download,
  Image as ImageIcon,
  Share2,
  ArrowUpFromLine,
  ArrowDownToLine,
  X,
  TreePine,
} from "lucide-react";
const FamilyTree = lazy(() => import("@/components/FamilyTree"));
import { PersonDialog } from "@/components/PersonDialog";
import { PersonForm } from "@/components/PersonForm";
import { ShareDialog } from "@/components/ShareDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTree } from "@/hooks/useTree";
import { useTreeData } from "@/hooks/useTreeData";
import {
  fullName,
  ancestorsOf,
  descendantsOf,
} from "@/lib/genealogy";
import { exportPdf, exportPng, downloadGedcom } from "@/lib/exporters";
import { useToast } from "@/hooks/use-toast";
import type { Person } from "@/integrations/supabase/types";

type HighlightMode = "none" | "ancestors" | "descendants";

export default function TreeView() {
  const { activeTree, canEdit, isAdmin, createNewTree } = useTree();
  const { people, unions, isLoading, refresh } = useTreeData(activeTree?.id);
  const { toast } = useToast();
  const treeRef = useRef<HTMLDivElement>(null);

  const [selected, setSelected] = useState<Person | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [hlMode, setHlMode] = useState<HighlightMode>("none");

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return people
      .filter((p) => fullName(p).toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, people]);

  const highlight = useMemo(() => {
    if (hlMode !== "none" && focusId) {
      const base = hlMode === "ancestors" ? ancestorsOf(focusId, people) : descendantsOf(focusId, people);
      base.add(focusId);
      return base;
    }
    if (search.trim()) return new Set(matches.map((m) => m.id));
    return undefined;
  }, [hlMode, focusId, people, search, matches]);

  function openPerson(id: string) {
    const p = people.find((x) => x.id === id) ?? null;
    setSelected(p);
    setDialogOpen(true);
  }

  function focusOn(p: Person) {
    setFocusId(p.id);
    setSearch("");
  }

  async function doExport(kind: "pdf" | "png") {
    const el = treeRef.current?.querySelector(".f3") as HTMLElement | null;
    if (!el) return;
    try {
      if (kind === "pdf") await exportPdf(el, activeTree?.name ?? "Árvore");
      else await exportPng(el, `${activeTree?.name ?? "arvore"}.png`);
    } catch (e) {
      toast({ title: "Erro ao exportar", description: (e as Error).message, variant: "destructive" });
    }
  }

  // Sem árvore: oferecer criação
  if (!activeTree) {
    return (
      <div className="container py-20 text-center space-y-4">
        <TreePine className="h-12 w-12 mx-auto text-primary" />
        <h2 className="text-2xl font-bold">Crie sua primeira árvore</h2>
        <p className="text-muted-foreground">Organize a história da sua família.</p>
        <Button
          onClick={async () => {
            const name = prompt("Nome da árvore (ex.: Família Silva):");
            if (name?.trim()) await createNewTree(name.trim());
          }}
        >
          <TreePine className="h-4 w-4 mr-2" /> Criar árvore
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toolbar */}
      <div className="border-b border-border bg-background/60 backdrop-blur px-4 py-2 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pessoa..."
            className="pl-8 w-56"
          />
          {matches.length > 0 && (
            <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
              {matches.map((m) => (
                <button
                  key={m.id}
                  onClick={() => focusOn(m)}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-secondary"
                >
                  {fullName(m)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={hlMode === "ancestors" ? "secondary" : "ghost"}
            size="sm"
            disabled={!focusId}
            onClick={() => setHlMode((m) => (m === "ancestors" ? "none" : "ancestors"))}
          >
            <ArrowUpFromLine className="h-4 w-4 mr-1" /> Ancestrais
          </Button>
          <Button
            variant={hlMode === "descendants" ? "secondary" : "ghost"}
            size="sm"
            disabled={!focusId}
            onClick={() => setHlMode((m) => (m === "descendants" ? "none" : "descendants"))}
          >
            <ArrowDownToLine className="h-4 w-4 mr-1" /> Descendentes
          </Button>
          {(focusId || hlMode !== "none") && (
            <Button variant="ghost" size="sm" onClick={() => { setFocusId(null); setHlMode("none"); }}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => doExport("png")}>
            <ImageIcon className="h-4 w-4 mr-1" /> PNG
          </Button>
          <Button variant="ghost" size="sm" onClick={() => doExport("pdf")}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadGedcom(people, unions, activeTree.name)}>
            GEDCOM
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => setSharing(true)}>
              <Share2 className="h-4 w-4 mr-1" /> Compartilhar
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Pessoa
            </Button>
          )}
        </div>
      </div>

      {/* Organograma */}
      <div ref={treeRef} className="flex-1 relative overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">Carregando árvore...</div>
        ) : people.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center text-center px-6">
            <div className="space-y-3">
              <TreePine className="h-10 w-10 mx-auto text-primary" />
              <p className="text-muted-foreground">Nenhuma pessoa cadastrada ainda.</p>
              {canEdit && (
                <Button onClick={() => setCreating(true)}>
                  <UserPlus className="h-4 w-4 mr-2" /> Adicionar a primeira pessoa
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                Carregando organograma...
              </div>
            }
          >
            <FamilyTree
              people={people}
              unions={unions}
              focusId={focusId}
              highlight={highlight}
              onSelect={openPerson}
              className="h-full"
            />
          </Suspense>
        )}
      </div>

      {/* Diálogos */}
      <PersonDialog
        person={selected}
        people={people}
        unions={unions}
        treeId={activeTree.id}
        rootId={focusId}
        canEdit={canEdit}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onChanged={refresh}
        onNavigate={(id) => openPerson(id)}
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova pessoa</DialogTitle>
          </DialogHeader>
          <PersonForm
            treeId={activeTree.id}
            people={people}
            onSaved={() => { setCreating(false); refresh(); }}
            onCancel={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>

      <ShareDialog treeId={activeTree.id} open={sharing} onOpenChange={setSharing} />
    </div>
  );
}
