import { useEffect, useState } from "react";
import { Shield, Plus, Trash2, History, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { supabase } from "@/integrations/supabase/client";
import { useTree } from "@/hooks/useTree";
import { listAudit } from "@/lib/people";
import type { AuditEntry, Member, MemberRole } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { activeTree, isAdmin } = useTree();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [newId, setNewId] = useState("");
  const [newRole, setNewRole] = useState<MemberRole>("viewer");

  const treeId = activeTree?.id;

  async function loadMembers() {
    if (!treeId) return;
    const { data } = await supabase
      .from("genea_members")
      .select("*")
      .eq("tree_id", treeId);
    setMembers((data as Member[]) ?? []);
  }

  useEffect(() => {
    loadMembers();
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

  async function addMember() {
    if (!treeId || !newId.trim()) return;
    const { error } = await supabase
      .from("genea_members")
      .upsert({ tree_id: treeId, user_id: newId.trim(), role: newRole });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setNewId("");
    toast({ title: "Membro adicionado." });
    loadMembers();
  }

  async function changeRole(userId: string, role: MemberRole) {
    if (!treeId) return;
    await supabase.from("genea_members").update({ role }).eq("tree_id", treeId).eq("user_id", userId);
    loadMembers();
  }

  async function removeMember(userId: string) {
    if (!treeId) return;
    await supabase.from("genea_members").delete().eq("tree_id", treeId).eq("user_id", userId);
    loadMembers();
  }

  return (
    <div className="container py-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" /> Administração
      </h1>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-2" /> Membros</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-4 w-4 mr-2" /> Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold">Adicionar membro</h2>
            <p className="text-xs text-muted-foreground">
              Informe o <strong>ID do usuário</strong> (UUID do Supabase Auth). O acesso
              de cada pessoa é gerido pelo ecossistema Controle Flive.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="UUID do usuário" value={newId} onChange={(e) => setNewId(e.target.value)} />
              <Select value={newRole} onValueChange={(v) => setNewRole(v as MemberRole)}>
                <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addMember}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
            </div>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.user_id}>
                    <TableCell className="font-mono text-xs">{m.user_id}</TableCell>
                    <TableCell>
                      <Select value={m.role} onValueChange={(v) => changeRole(m.user_id, v as MemberRole)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeMember(m.user_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
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
