import { useEffect, useState } from "react";
import { Shield, Trash2, History, Users, UserCheck, Clock, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTree } from "@/hooks/useTree";
import {
  listAudit,
  listMembers,
  setMemberRole,
  removeMember,
} from "@/lib/people";
import type { AuditEntry, Member, MemberRole } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { activeTree, isAdmin } = useTree();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const treeId = activeTree?.id;

  function reload() {
    if (!treeId) return;
    listMembers(treeId).then(setMembers).catch(() => {});
  }

  useEffect(() => {
    reload();
    if (treeId) listAudit(treeId).then(setAudit).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId]);

  if (!isAdmin) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        Acesso restrito a administradores.
      </div>
    );
  }

  const pending = members.filter((m) => m.role === "pending");
  const active = members.filter((m) => m.role !== "pending");
  const who = (m: Member) => m.display_name || m.email || m.user_id;

  async function approve(m: Member) {
    if (!treeId) return;
    try {
      await setMemberRole(treeId, m.user_id, "editor");
      toast({ title: `${who(m)} aprovado como editor.` });
      reload();
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function reject(m: Member) {
    if (!treeId) return;
    await removeMember(treeId, m.user_id);
    toast({ title: "Solicitação recusada." });
    reload();
  }

  async function changeRole(m: Member, role: MemberRole) {
    if (!treeId) return;
    await setMemberRole(treeId, m.user_id, role);
    reload();
  }

  async function remove(m: Member) {
    if (!treeId) return;
    if (!confirm(`Remover o acesso de ${who(m)}?`)) return;
    await removeMember(treeId, m.user_id);
    reload();
  }

  return (
    <div className="container py-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" /> Administração
      </h1>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" /> Membros
            {pending.length > 0 && (
              <Badge className="ml-2 bg-warning text-warning-foreground">{pending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-4 w-4 mr-2" /> Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {/* Solicitações pendentes */}
          {pending.length > 0 && (
            <Card className="p-4 space-y-3 border-warning/40">
              <h2 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" /> Solicitações de acesso
              </h2>
              {pending.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between gap-3 border border-border rounded-lg p-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.display_name || "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.email || m.user_id}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => approve(m)}>
                      <Check className="h-4 w-4 mr-1" /> Aprovar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => reject(m)}>
                      <X className="h-4 w-4 mr-1" /> Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Membros ativos */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.map((m) => (
                  <TableRow key={m.user_id}>
                    <TableCell>
                      <div className="font-medium">{m.display_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{m.email || m.user_id}</div>
                    </TableCell>
                    <TableCell>
                      <Select value={m.role} onValueChange={(v) => changeRole(m, v as MemberRole)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(m)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {active.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Nenhum membro ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <UserCheck className="h-3.5 w-3.5" />
            Para convidar colaboradores, gere um <strong>convite de edição</strong> em
            "Compartilhar" (na tela da Árvore). Eles aparecerão aqui como solicitação
            para você aprovar.
          </p>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Resumo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(a.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.action === "delete" ? "destructive" : "secondary"}>
                        {a.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{a.entity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.summary}</TableCell>
                  </TableRow>
                ))}
                {audit.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum registro de auditoria ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
