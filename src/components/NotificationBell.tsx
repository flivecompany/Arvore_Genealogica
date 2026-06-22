import { useCallback, useEffect, useState } from "react";
import { Bell, Check, Clock, CheckCircle2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTree } from "@/hooks/useTree";
import {
  listNotifications,
  markNotificationsRead,
  approveMember,
  requestApproval,
  listLinkRequests,
  resolveLinkRequest,
} from "@/lib/people";
import type { AppNotification, LinkRequest } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export function NotificationBell() {
  const { user } = useAuth();
  const { activeTree, role, refreshTrees } = useTree();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [linkReqs, setLinkReqs] = useState<LinkRequest[]>([]);
  const [asking, setAsking] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    listNotifications().then(setNotifs).catch(() => {});
    listLinkRequests()
      .then((rs) => setLinkReqs(rs.filter((r) => r.requester_user !== user.id)))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    load();
  }, [load, activeTree?.id]);

  // Atualiza ao focar a aba e a cada 60s.
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const iv = window.setInterval(load, 60000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(iv);
    };
  }, [load]);

  const unread = notifs.filter((n) => !n.read).length;
  const alertCount = unread + linkReqs.length;
  const isPending = role === "pending";

  async function resolveLink(r: LinkRequest, approve: boolean) {
    try {
      await resolveLinkRequest(r.id, approve);
      toast({
        title: approve
          ? "Permitido — a pessoa foi adicionada à árvore solicitante."
          : "Pedido recusado.",
      });
      load();
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function togglePanel() {
    const next = !open;
    setOpen(next);
    if (next) {
      const ids = notifs.filter((n) => !n.read).map((n) => n.id);
      if (ids.length) {
        markNotificationsRead(ids).catch(() => {});
        setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
      }
    }
  }

  async function approve(n: AppNotification) {
    if (!n.tree_id || !n.actor) return;
    try {
      await approveMember(n.tree_id, n.actor);
      toast({ title: "Acesso aprovado." });
      load();
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function askApproval() {
    if (!activeTree) return;
    setAsking(true);
    try {
      await requestApproval(activeTree.id);
      toast({ title: "Pedido de aprovação enviado ao administrador." });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" aria-label="Notificações" onClick={togglePanel}>
        <Bell className="h-5 w-5" />
        {(alertCount > 0 || isPending) && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center">
            {alertCount > 0 ? alertCount : "!"}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto z-50 rounded-lg border border-border bg-popover shadow-lg p-2">
            <div className="px-2 py-1.5 text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notificações
            </div>

            {isPending && (
              <div className="m-1 p-3 rounded-lg bg-warning/10 border border-warning/30 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-warning" /> Seu acesso aguarda aprovação.
                </div>
                <Button size="sm" className="w-full" onClick={askApproval} disabled={asking}>
                  <UserPlus className="h-4 w-4 mr-1" /> Solicitar aprovação
                </Button>
              </div>
            )}

            {linkReqs.map((r) => (
              <div
                key={`lr-${r.id}`}
                className="m-1 p-2 rounded-lg border border-primary/30 bg-primary/5 space-y-1.5"
              >
                <p className="text-sm">
                  A família <strong>{r.requester_tree_name ?? "outra árvore"}</strong> quer
                  incluir <strong>{r.target_name ?? "uma pessoa"}</strong> na árvore deles.
                  Permite compartilhar?
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7" onClick={() => resolveLink(r, true)}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Permitir
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-destructive"
                    onClick={() => resolveLink(r, false)}
                  >
                    Recusar
                  </Button>
                </div>
              </div>
            ))}

            {notifs.length === 0 && linkReqs.length === 0 && !isPending && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma notificação.
              </p>
            )}

            <div className="space-y-1">
              {notifs.map((n) => (
                <div key={n.id} className="p-2 rounded-md hover:bg-secondary/60">
                  <div className="flex items-start gap-2">
                    {n.kind === "access_approved" ? (
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    ) : (
                      <UserPlus className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("pt-BR")}
                      </p>
                      {n.kind === "access_request" && n.actor && n.tree_id && (
                        <Button size="sm" className="mt-1 h-7" onClick={() => approve(n)}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5"
              onClick={() => {
                refreshTrees();
                load();
              }}
            >
              Atualizar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
