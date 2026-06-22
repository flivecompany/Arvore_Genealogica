import { useMemo, useState } from "react";
import { UserPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PersonAvatar } from "@/components/PersonAvatar";
import { SexIcon, sexLabel } from "@/components/SexIcon";
import { PersonDialog } from "@/components/PersonDialog";
import { PersonForm } from "@/components/PersonForm";
import { useTree } from "@/hooks/useTree";
import { useTreeData } from "@/hooks/useTreeData";
import { fullName, formatDate } from "@/lib/genealogy";
import type { Person, Sex } from "@/integrations/supabase/types";

export default function People() {
  const { activeTree, canEdit } = useTree();
  const { people, unions, refresh } = useTreeData(activeTree?.id);

  const [q, setQ] = useState("");
  const [sex, setSex] = useState<Sex | "all">("all");
  const [status, setStatus] = useState<"all" | "living" | "deceased">("all");
  const [year, setYear] = useState("");
  const [city, setCity] = useState("");

  const [selected, setSelected] = useState<Person | null>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const cityTerm = city.trim().toLowerCase();
    return people.filter((p) => {
      if (term) {
        const hay = [p.first_name, p.last_name, p.maiden_name, p.nickname]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (sex !== "all" && p.sex !== sex) return false;
      if (status === "living" && !p.is_living) return false;
      if (status === "deceased" && p.is_living) return false;
      if (year) {
        const by = p.birth_date ? new Date(p.birth_date).getFullYear().toString() : p.birth_date_text ?? "";
        if (!by.includes(year)) return false;
      }
      if (cityTerm) {
        const places = [p.birth_place, p.death_place].filter(Boolean).join(" ").toLowerCase();
        if (!places.includes(cityTerm)) return false;
      }
      return true;
    });
  }, [people, q, sex, status, year, city]);

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pessoas</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {people.length} {people.length === 1 ? "pessoa" : "pessoas"}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setCreating(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Nova pessoa
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, sobrenome, apelido" className="pl-8" />
        </div>
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" />
        <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Ano de nascimento" />
        <div className="flex gap-2">
          <Select value={sex} onValueChange={(v) => setSex(v as Sex | "all")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sexo: todos</SelectItem>
              <SelectItem value="male">Masculino</SelectItem>
              <SelectItem value="female">Feminino</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="living">Vivos</SelectItem>
              <SelectItem value="deceased">Falecidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Grade */}
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Sexo</TableHead>
              <TableHead>Nascimento</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer"
                onClick={() => { setSelected(p); setOpen(true); }}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <PersonAvatar person={p} className="h-8 w-8" />
                    <span className="font-medium">{fullName(p)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-sm">
                    <SexIcon sex={p.sex} className="h-3.5 w-3.5" /> {sexLabel(p.sex)}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatDate(p.birth_date, p.birth_date_text) || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.birth_place || "—"}
                </TableCell>
                <TableCell>
                  {p.is_living ? (
                    <Badge variant="secondary">Vivo(a)</Badge>
                  ) : (
                    <Badge variant="outline">
                      Falecido(a)
                      {p.death_date ? ` · ${new Date(p.death_date).getFullYear()}` : ""}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  Nenhuma pessoa encontrada com esses filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <PersonDialog
        person={selected}
        people={people}
        unions={unions}
        treeId={activeTree?.id ?? ""}
        canEdit={canEdit}
        open={open}
        onOpenChange={setOpen}
        onChanged={refresh}
        onNavigate={(id) => setSelected(people.find((x) => x.id === id) ?? null)}
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nova pessoa</DialogTitle></DialogHeader>
          {activeTree && (
            <PersonForm
              treeId={activeTree.id}
              people={people}
              onSaved={() => { setCreating(false); refresh(); }}
              onCancel={() => setCreating(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
