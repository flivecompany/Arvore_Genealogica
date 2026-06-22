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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Link2, Trash2, Plus, Eye, Pencil } from "lucide-react";
import {
  createShareLink,
  listShareLinks,
  revokeShareLink,
  createInviteLink,
  listInviteLinks,
  revokeInviteLink,
} from "@/lib/people";
import type { ShareLink, InviteLink } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

interface Props {
  treeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ treeId, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => {
    listShareLinks(treeId).then(setShareLinks).catch(() => {});
    listInviteLinks(treeId).then(setInviteLinks).catch(() => {});
  };
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, treeId]);

  const shareUrl = (t: string) => `${window.location.origin}/compartilhar/${t}`;
  const inviteUrl = (t: string) => `${window.location.origin}/convite/${t}`;

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  }

  async function gen(kind: "share" | "invite") {
    setBusy(true);
    try {
      if (kind === "share") await createShareLink(treeId);
      else await createInviteLink(treeId);
      load();
      toast({ title: "Link criado." });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const activeShares = shareLinks.filter((l) => !l.revoked);
  const activeInvites = inviteLinks.filter((l) => !l.revoked);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Compartilhar árvore
          </DialogTitle>
          <DialogDescription>
            Escolha entre um link de <strong>visualização</strong> (somente
            leitura) ou um <strong>convite para edição</strong> com aprovação.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="view">
          <TabsList className="w-full">
            <TabsTrigger value="view" className="flex-1">
              <Eye className="h-4 w-4 mr-2" /> Somente leitura
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex-1">
              <Pencil className="h-4 w-4 mr-2" /> Edição (aprovação)
            </TabsTrigger>
          </TabsList>

          {/* Somente leitura */}
          <TabsContent value="view" className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Qualquer pessoa com o link visualiza a árvore (sem editar e sem login).
            </p>
            <Button onClick={() => gen("share")} disabled={busy} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Gerar link de visualização
            </Button>
            <LinkList
              items={activeShares.map((l) => ({ token: l.token, url: shareUrl(l.token) }))}
              onCopy={copy}
              onRevoke={(t) => revokeShareLink(t).then(load)}
            />
          </TabsContent>

          {/* Edição com aprovação */}
          <TabsContent value="edit" className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Quem abrir o convite faz login e <strong>solicita acesso</strong>. Você
              aprova uma vez no painel <strong>Admin → Membros</strong>; depois a
              pessoa edita a árvore livremente.
            </p>
            <Button onClick={() => gen("invite")} disabled={busy} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Gerar convite de edição
            </Button>
            <LinkList
              items={activeInvites.map((l) => ({ token: l.token, url: inviteUrl(l.token) }))}
              onCopy={copy}
              onRevoke={(t) => revokeInviteLink(t).then(load)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function LinkList({
  items,
  onCopy,
  onRevoke,
}: {
  items: { token: string; url: string }[];
  onCopy: (url: string) => void;
  onRevoke: (token: string) => void;
}) {
  if (items.length === 0)
    return (
      <p className="text-sm text-muted-foreground text-center py-3">Nenhum link ativo.</p>
    );
  return (
    <div className="space-y-2 max-h-56 overflow-y-auto">
      {items.map((l) => (
        <div key={l.token} className="flex items-center gap-2">
          <Input readOnly value={l.url} className="text-xs" />
          <Button size="icon" variant="ghost" onClick={() => onCopy(l.url)}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive"
            onClick={() => onRevoke(l.token)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
