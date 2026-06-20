import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Link2, Trash2, Plus } from "lucide-react";
import {
  createShareLink,
  listShareLinks,
  revokeShareLink,
} from "@/lib/people";
import type { ShareLink } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

interface Props {
  treeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ treeId, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => listShareLinks(treeId).then(setLinks).catch(() => {});
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, treeId]);

  const urlFor = (token: string) => `${window.location.origin}/compartilhar/${token}`;

  async function create() {
    setBusy(true);
    try {
      await createShareLink(treeId);
      await load();
      toast({ title: "Link de compartilhamento criado." });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(urlFor(token));
    toast({ title: "Link copiado!" });
  }

  async function revoke(token: string) {
    await revokeShareLink(token);
    await load();
  }

  const active = links.filter((l) => !l.revoked);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Compartilhar árvore
          </DialogTitle>
          <DialogDescription>
            Gere um link seguro de somente leitura. Qualquer pessoa com o link
            poderá visualizar (sem editar). Você pode revogar quando quiser.
          </DialogDescription>
        </DialogHeader>

        <Button onClick={create} disabled={busy} className="w-full">
          <Plus className="h-4 w-4 mr-2" /> Gerar novo link
        </Button>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {active.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum link ativo.
            </p>
          )}
          {active.map((l) => (
            <div key={l.token} className="flex items-center gap-2">
              <Input readOnly value={urlFor(l.token)} className="text-xs" />
              <Button size="icon" variant="ghost" onClick={() => copy(l.token)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => revoke(l.token)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
