import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listMyPendingConsents, resolveConsent } from "@/lib/people";
import type { PendingConsent } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useTree } from "@/hooks/useTree";

/**
 * Mostra um pedido de consentimento quando o usuário foi incluído (por e-mail)
 * em uma árvore — ele aceita ou recusa participar.
 */
export function ConsentPrompt() {
  const { toast } = useToast();
  const { refreshTrees } = useTree();
  const [items, setItems] = useState<PendingConsent[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    listMyPendingConsents()
      .then((c) => {
        if (c.length) {
          setItems(c);
          setOpen(true);
        }
      })
      .catch(() => {});
  }, []);

  async function resolve(c: PendingConsent, accept: boolean) {
    try {
      await resolveConsent(c.id, accept);
      const rest = items.filter((x) => x.id !== c.id);
      setItems(rest);
      if (rest.length === 0) setOpen(false);
      if (accept) refreshTrees();
      toast({
        title: accept ? "Você agora participa desta árvore." : "Você recusou participar.",
      });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  }

  if (!open || items.length === 0) return null;
  const c = items[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Você foi incluído em uma árvore genealógica</DialogTitle>
          <DialogDescription>
            Confirme se aceita participar. Você pode aceitar ou recusar.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm">
          A árvore <strong>{c.tree_name}</strong> incluiu você como{" "}
          <strong>{c.person_name}</strong>.
        </p>
        {items.length > 1 && (
          <p className="text-xs text-muted-foreground">
            +{items.length - 1} outro(s) pedido(s) após este.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" className="text-destructive" onClick={() => resolve(c, false)}>
            Recusar
          </Button>
          <Button onClick={() => resolve(c, true)}>Aceitar participar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
