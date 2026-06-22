import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Loader2, AlertTriangle, Send, Check, Users } from "lucide-react";
import type {
  Person,
  Sex,
  SocialLink,
  GlobalPersonMatch,
} from "@/integrations/supabase/types";
import {
  upsertPerson,
  searchGlobalPeople,
  requestPersonLink,
  announcePerson,
  type PersonInput,
} from "@/lib/people";
import { uploadFile } from "@/lib/storage";
import { fullName } from "@/lib/genealogy";
import { useToast } from "@/hooks/use-toast";

interface Props {
  treeId: string;
  people: Person[];
  initial?: Person | null;
  onSaved: (p: Person) => void;
  onCancel?: () => void;
}

const NONE = "__none__";

export function PersonForm({ treeId, people, initial, onSaved, onCancel }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [crossMatches, setCrossMatches] = useState<GlobalPersonMatch[]>([]);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [form, setForm] = useState<PersonInput>({
    tree_id: treeId,
    id: initial?.id,
    first_name: initial?.first_name ?? "",
    last_name: initial?.last_name ?? "",
    maiden_name: initial?.maiden_name ?? "",
    nickname: initial?.nickname ?? "",
    sex: initial?.sex ?? "other",
    birth_date: initial?.birth_date ?? null,
    birth_date_text: initial?.birth_date_text ?? "",
    birth_place: initial?.birth_place ?? "",
    death_date: initial?.death_date ?? null,
    death_date_text: initial?.death_date_text ?? "",
    death_place: initial?.death_place ?? "",
    is_living: initial?.is_living ?? true,
    father_id: initial?.father_id ?? null,
    mother_id: initial?.mother_id ?? null,
    occupation: initial?.occupation ?? "",
    email: initial?.email ?? "",
    biography: initial?.biography ?? "",
    notes: initial?.notes ?? "",
    avatar_url: initial?.avatar_url ?? null,
    social_links: initial?.social_links ?? [],
  });

  const set = <K extends keyof PersonInput>(k: K, v: PersonInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Aviso anti-duplicado: nome igual (ignorando acentos/caixa) já existente.
  const duplicateName = useMemo(() => {
    const norm = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
    const cur = norm(`${form.first_name ?? ""} ${form.last_name ?? ""}`);
    if (cur.length < 3) return null;
    const match = people.find(
      (p) => p.id !== initial?.id && norm(`${p.first_name} ${p.last_name ?? ""}`) === cur
    );
    return match ? fullName(match) : null;
  }, [form.first_name, form.last_name, people, initial?.id]);

  // Busca (ao vivo) pessoas com o mesmo nome em OUTRAS árvores da plataforma.
  const fullNameTyped = `${form.first_name ?? ""} ${form.last_name ?? ""}`.trim();
  useEffect(() => {
    if (initial?.id || fullNameTyped.length < 3) {
      setCrossMatches([]);
      return;
    }
    const t = setTimeout(() => {
      searchGlobalPeople(fullNameTyped)
        .then(setCrossMatches)
        .catch(() => setCrossMatches([]));
    }, 450);
    return () => clearTimeout(t);
  }, [fullNameTyped, initial?.id]);

  const hasPossibleMatch = !initial?.id && (!!duplicateName || crossMatches.length > 0);

  async function requestLink(m: GlobalPersonMatch) {
    try {
      const r = await requestPersonLink(m.person_id, treeId);
      setRequestedIds((s) => new Set(s).add(m.person_id));
      toast({
        title:
          r.status === "ok"
            ? "Permissão solicitada!"
            : "Você já havia solicitado esta pessoa.",
        description: "Ela aparecerá na sua árvore quando a família dela autorizar.",
      });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  }

  const candidates = people.filter((p) => p.id !== initial?.id);
  const males = candidates.filter((p) => p.sex !== "female");
  const females = candidates.filter((p) => p.sex !== "male");

  const setLink = (i: number, patch: Partial<SocialLink>) =>
    set(
      "social_links",
      (form.social_links ?? []).map((l, idx) => (idx === i ? { ...l, ...patch } : l))
    );

  async function handleSubmit() {
    if (!form.first_name?.trim()) {
      toast({ title: "Informe ao menos o nome.", variant: "destructive" });
      return;
    }
    if (hasPossibleMatch && !allowDuplicate) {
      toast({
        title: "Possível familiaridade pelo nome",
        description:
          "Use a pessoa existente, solicite permissão, ou confirme em 'Criar assim mesmo'.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      let avatar_url = form.avatar_url ?? null;
      if (avatarFile) avatar_url = await uploadFile(treeId, avatarFile, "avatars");
      const payload: PersonInput = {
        ...form,
        avatar_url,
        birth_date: form.birth_date || null,
        death_date: form.death_date || null,
        father_id: form.father_id || null,
        mother_id: form.mother_id || null,
      };
      const saved = await upsertPerson(payload);
      if (saved && form.email?.trim()) {
        await announcePerson(saved.id);
      }
      toast({ title: "Registro salvo." });
      onSaved(saved);
    } catch (e) {
      const msg = (e as Error).message || "Falha desconhecida ao salvar.";
      // eslint-disable-next-line no-console
      console.error("Erro ao salvar pessoa:", e);
      setErrorMsg(msg);
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Identificação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nome *">
          <Input value={form.first_name ?? ""} onChange={(e) => set("first_name", e.target.value)} />
        </Field>
        <Field label="Sobrenome">
          <Input value={form.last_name ?? ""} onChange={(e) => set("last_name", e.target.value)} />
        </Field>
        <Field label="Nome de solteiro(a)">
          <Input value={form.maiden_name ?? ""} onChange={(e) => set("maiden_name", e.target.value)} />
        </Field>
        <Field label="Apelido">
          <Input value={form.nickname ?? ""} onChange={(e) => set("nickname", e.target.value)} />
        </Field>
        <Field label="Sexo">
          <Select value={form.sex} onValueChange={(v) => set("sex", v as Sex)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Masculino</SelectItem>
              <SelectItem value="female">Feminino</SelectItem>
              <SelectItem value="other">Outro / não informado</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Foto de perfil">
          <Input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
        </Field>
      </div>

      {hasPossibleMatch && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 space-y-2">
          <div className="text-sm font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-warning" /> Possível familiaridade pelo nome
          </div>
          {duplicateName && (
            <p className="text-sm">
              Já existe <strong>{duplicateName}</strong> nesta árvore. Se for a mesma
              pessoa, cancele e use a existente.
            </p>
          )}
          {crossMatches.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Há pessoas com este nome em outras famílias. Solicite permissão para
                incluí-la — ela aparecerá na sua árvore quando autorizarem:
              </p>
              {crossMatches.map((m) => {
                const done = requestedIds.has(m.person_id);
                return (
                  <div
                    key={m.person_id}
                    className="flex items-center justify-between gap-2 border-t border-border/50 pt-1"
                  >
                    <span className="text-sm flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {m.full_name}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={done ? "ghost" : "outline"}
                      disabled={done}
                      onClick={() => requestLink(m)}
                    >
                      {done ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1" /> Solicitado
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5 mr-1" /> Solicitar permissão
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {!allowDuplicate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setAllowDuplicate(true)}
            >
              Não é a mesma pessoa — criar assim mesmo (duplicar)
            </Button>
          ) : (
            <p className="text-xs text-success">Ok — pode salvar como nova pessoa.</p>
          )}
        </div>
      )}

      {/* Nascimento */}
      <fieldset className="border border-border rounded-lg p-3 space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Nascimento</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Data">
            <Input type="date" value={form.birth_date ?? ""} onChange={(e) => set("birth_date", e.target.value)} />
          </Field>
          <Field label="Data aproximada (texto)">
            <Input placeholder="c. 1890" value={form.birth_date_text ?? ""} onChange={(e) => set("birth_date_text", e.target.value)} />
          </Field>
          <Field label="Local">
            <Input value={form.birth_place ?? ""} onChange={(e) => set("birth_place", e.target.value)} />
          </Field>
        </div>
      </fieldset>

      {/* Falecimento */}
      <fieldset className="border border-border rounded-lg p-3 space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Situação</legend>
        <div className="flex items-center gap-2">
          <Switch checked={!!form.is_living} onCheckedChange={(v) => set("is_living", v)} />
          <span className="text-sm">{form.is_living ? "Vivo(a)" : "Falecido(a)"}</span>
        </div>
        {!form.is_living && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Data do falecimento">
              <Input type="date" value={form.death_date ?? ""} onChange={(e) => set("death_date", e.target.value)} />
            </Field>
            <Field label="Data aproximada (texto)">
              <Input placeholder="c. 1970" value={form.death_date_text ?? ""} onChange={(e) => set("death_date_text", e.target.value)} />
            </Field>
            <Field label="Local">
              <Input value={form.death_place ?? ""} onChange={(e) => set("death_place", e.target.value)} />
            </Field>
          </div>
        )}
      </fieldset>

      {/* Parentesco */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Pai">
          <ParentSelect value={form.father_id} options={males} onChange={(v) => set("father_id", v)} />
        </Field>
        <Field label="Mãe">
          <ParentSelect value={form.mother_id} options={females} onChange={(v) => set("mother_id", v)} />
        </Field>
      </div>

      {/* Perfil */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Profissão">
          <Input value={form.occupation ?? ""} onChange={(e) => set("occupation", e.target.value)} />
        </Field>
        <Field label="E-mail (opcional)">
          <Input
            type="email"
            value={form.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            placeholder="email@exemplo.com"
          />
        </Field>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        Se a pessoa tiver conta no sistema, ela é avisada e poderá confirmar se aceita
        participar desta árvore.
      </p>
      <Field label="Biografia">
        <Textarea rows={3} value={form.biography ?? ""} onChange={(e) => set("biography", e.target.value)} />
      </Field>
      <Field label="Observações">
        <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </Field>

      {/* Redes sociais */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Links / redes sociais</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => set("social_links", [...(form.social_links ?? []), { label: "", url: "" }])}
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
        {(form.social_links ?? []).map((link, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Rótulo" value={link.label} onChange={(e) => setLink(i, { label: e.target.value })} />
            <Input placeholder="https://..." value={link.url} onChange={(e) => setLink(i, { url: e.target.value })} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => set("social_links", (form.social_links ?? []).filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {errorMsg && (
        <p className="text-sm text-destructive border border-destructive/40 rounded-md p-2 bg-destructive/5 break-words">
          {errorMsg}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ParentSelect({
  value,
  options,
  onChange,
}: {
  value: string | null | undefined;
  options: Person[];
  onChange: (v: string | null) => void;
}) {
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>— Não informado —</SelectItem>
        {options.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {fullName(p)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
