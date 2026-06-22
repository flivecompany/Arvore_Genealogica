import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Pencil,
  Trash2,
  Heart,
  MapPin,
  Briefcase,
  ExternalLink,
  Plus,
  Loader2,
} from "lucide-react";
import { PersonAvatar } from "./PersonAvatar";
import { SexIcon, sexLabel } from "./SexIcon";
import { PersonForm } from "./PersonForm";
import type { Person, Union } from "@/integrations/supabase/types";
import {
  fullName,
  lifeSpan,
  formatDate,
  ageOf,
  kinship,
} from "@/lib/genealogy";
import {
  deletePerson,
  addUnion,
  deleteUnion,
  addMediaRecord,
  listMedia,
  setPersonParent,
} from "@/lib/people";

type RelativeKind = "father" | "mother" | "spouse" | "child";
const RELATIVE_LABEL: Record<RelativeKind, string> = {
  father: "pai",
  mother: "mãe",
  spouse: "cônjuge",
  child: "filho(a)",
};
import { uploadFile } from "@/lib/storage";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { useToast } from "@/hooks/use-toast";

interface Props {
  person: Person | null;
  people: Person[];
  unions: Union[];
  treeId: string;
  rootId?: string | null;
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  onNavigate?: (id: string) => void;
}

export function PersonDialog({
  person,
  people,
  unions,
  treeId,
  rootId,
  canEdit,
  open,
  onOpenChange,
  onChanged,
  onNavigate,
}: Props) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [addKind, setAddKind] = useState<RelativeKind | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [linkSel, setLinkSel] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setAddKind(null);
      setCreatingNew(false);
      setLinkSel("");
    }
  }, [open, person?.id]);

  useEffect(() => {
    setCreatingNew(false);
    setLinkSel("");
  }, [addKind]);

  async function applyRelation(kind: RelativeKind, otherId: string) {
    if (!person) return;
    if (kind === "father") await setPersonParent(person.id, "father", otherId);
    else if (kind === "mother") await setPersonParent(person.id, "mother", otherId);
    else if (kind === "spouse") await addUnion(treeId, person.id, otherId);
    else if (kind === "child")
      await setPersonParent(otherId, person.sex === "female" ? "mother" : "father", person.id);
  }

  async function handleRelativeSaved(np: Person) {
    if (!person || !addKind) return;
    try {
      await applyRelation(addKind, np.id);
      toast({ title: "Parente adicionado e vinculado." });
    } catch (e) {
      toast({
        title: "Pessoa criada, mas falha ao vincular",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setAddKind(null);
      onChanged();
    }
  }

  async function linkExisting() {
    if (!person || !addKind || !linkSel) return;
    try {
      await applyRelation(addKind, linkSel);
      toast({ title: "Parente vinculado." });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAddKind(null);
      onChanged();
    }
  }

  if (!person) return null;

  const byId = new Map(people.map((p) => [p.id, p]));
  const father = person.father_id ? byId.get(person.father_id) : null;
  const mother = person.mother_id ? byId.get(person.mother_id) : null;
  const children = people.filter(
    (p) => p.father_id === person.id || p.mother_id === person.id
  );
  const siblings = people.filter(
    (p) =>
      p.id !== person.id &&
      ((person.father_id && p.father_id === person.father_id) ||
        (person.mother_id && p.mother_id === person.mother_id))
  );
  const spouseIds = unions
    .filter((u) => u.partner1_id === person.id || u.partner2_id === person.id)
    .map((u) => (u.partner1_id === person.id ? u.partner2_id : u.partner1_id));
  const spouses = spouseIds.map((id) => byId.get(id)).filter(Boolean) as Person[];

  async function handleDelete() {
    if (!confirm(`Remover "${fullName(person!)}"? Esta ação não pode ser desfeita.`))
      return;
    try {
      await deletePerson(person!.id);
      toast({ title: "Pessoa removida." });
      onChanged();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <PersonAvatar person={person} className="h-12 w-12" />
            <div className="min-w-0">
              <div className="truncate">{fullName(person)}</div>
              <div className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                <SexIcon sex={person.sex} className="h-3.5 w-3.5" />
                {lifeSpan(person) || sexLabel(person.sex)}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {editing ? (
          <PersonForm
            treeId={treeId}
            people={people}
            initial={person}
            onSaved={() => {
              setEditing(false);
              onChanged();
            }}
            onCancel={() => setEditing(false)}
          />
        ) : addKind ? (
          <div className="space-y-3">
            <div className="text-sm font-medium">
              Adicionar {RELATIVE_LABEL[addKind]} de {fullName(person)}
            </div>
            {creatingNew ? (
              <PersonForm
                treeId={treeId}
                people={people}
                onSaved={handleRelativeSaved}
                onCancel={() => setCreatingNew(false)}
              />
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Vincular uma pessoa <strong>já cadastrada</strong> como {RELATIVE_LABEL[addKind]}:
                </div>
                <div className="flex gap-2">
                  <Select value={linkSel} onValueChange={setLinkSel}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Escolher pessoa existente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {people
                        .filter((p) => p.id !== person.id)
                        .filter((p) =>
                          addKind === "father"
                            ? p.sex !== "female"
                            : addKind === "mother"
                            ? p.sex !== "male"
                            : true
                        )
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {fullName(p)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={linkExisting} disabled={!linkSel}>
                    Vincular
                  </Button>
                </div>
                <div className="text-center text-xs text-muted-foreground py-1">— ou —</div>
                <Button variant="outline" className="w-full" onClick={() => setCreatingNew(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Cadastrar pessoa nova
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setAddKind(null)}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Tabs defaultValue="info">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">Perfil</TabsTrigger>
              <TabsTrigger value="family" className="flex-1">Família</TabsTrigger>
              <TabsTrigger value="gallery" className="flex-1">Galeria</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-3 pt-2">
              {!person.is_living && (
                <Badge variant="secondary">Falecido(a)</Badge>
              )}
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Info label="Nascimento" value={formatDate(person.birth_date, person.birth_date_text)} />
                <Info label="Local de nascimento" value={person.birth_place} icon={<MapPin className="h-3.5 w-3.5" />} />
                {!person.is_living && (
                  <>
                    <Info label="Falecimento" value={formatDate(person.death_date, person.death_date_text)} />
                    <Info label="Local de falecimento" value={person.death_place} icon={<MapPin className="h-3.5 w-3.5" />} />
                  </>
                )}
                {ageOf(person) !== null && (
                  <Info label={person.is_living ? "Idade" : "Idade ao falecer"} value={`${ageOf(person)} anos`} />
                )}
                <Info label="Profissão" value={person.occupation} icon={<Briefcase className="h-3.5 w-3.5" />} />
                {rootId && rootId !== person.id && (
                  <Info label="Parentesco com a raiz" value={kinship(rootId, person.id, people, unions)} />
                )}
              </dl>
              {person.biography && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Biografia</div>
                  <p className="text-sm whitespace-pre-wrap">{person.biography}</p>
                </div>
              )}
              {person.notes && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Observações</div>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{person.notes}</p>
                </div>
              )}
              {person.social_links?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {person.social_links.map((l, i) => (
                    <a key={i} href={l.url} target="_blank" rel="noreferrer">
                      <Badge variant="outline" className="gap-1">
                        <ExternalLink className="h-3 w-3" /> {l.label || l.url}
                      </Badge>
                    </a>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="family" className="space-y-4 pt-2">
              <Relations title="Pais" people={[father, mother].filter(Boolean) as Person[]} onNavigate={onNavigate} />
              <Relations title="Cônjuge(s)" people={spouses} onNavigate={onNavigate} />
              <Relations title="Irmãos" people={siblings} onNavigate={onNavigate} />
              <Relations title="Filhos" people={children} onNavigate={onNavigate} />
              {canEdit && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Adicionar parente (vincular já existente ou cadastrar nova)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["father", "mother", "spouse", "child"] as RelativeKind[]).map((k) => (
                      <Button key={k} size="sm" variant="outline" onClick={() => setAddKind(k)}>
                        <Plus className="h-4 w-4 mr-1" /> {RELATIVE_LABEL[k]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="gallery" className="pt-2">
              <Gallery person={person} treeId={treeId} canEdit={canEdit} />
            </TabsContent>
          </Tabs>
        )}

        {!editing && !addKind && canEdit && (
          <div className="flex justify-between pt-2 border-t border-border">
            <Button variant="ghost" className="text-destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Remover
            </Button>
            <Button onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1">{icon}{value}</dd>
    </div>
  );
}

function Relations({
  title,
  people,
  onNavigate,
}: {
  title: string;
  people: Person[];
  onNavigate?: (id: string) => void;
}) {
  if (people.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground mb-1">{title}</div>
      <div className="flex flex-wrap gap-2">
        {people.map((p) => (
          <button
            key={p.id}
            onClick={() => onNavigate?.(p.id)}
            className="flex items-center gap-2 rounded-full border border-border pl-1 pr-3 py-1 hover:bg-secondary transition-colors"
          >
            <PersonAvatar person={p} className="h-7 w-7 ring-1 ring-offset-1" />
            <span className="text-sm">{fullName(p)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AddSpouse({
  person,
  people,
  treeId,
  unions,
  onChanged,
}: {
  person: Person;
  people: Person[];
  treeId: string;
  unions: Union[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [value, setValue] = useState<string>("");
  const existing = new Set(
    unions
      .filter((u) => u.partner1_id === person.id || u.partner2_id === person.id)
      .flatMap((u) => [u.partner1_id, u.partner2_id])
  );
  const options = people.filter((p) => p.id !== person.id && !existing.has(p.id));

  async function add() {
    if (!value) return;
    try {
      await addUnion(treeId, person.id, value);
      toast({ title: "Cônjuge vinculado." });
      setValue("");
      onChanged();
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <div className="flex gap-2 items-center pt-2 border-t border-border">
      <Heart className="h-4 w-4 text-female shrink-0" />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="flex-1"><SelectValue placeholder="Vincular cônjuge..." /></SelectTrigger>
        <SelectContent>
          {options.map((p) => (
            <SelectItem key={p.id} value={p.id}>{fullName(p)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={add} disabled={!value}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Gallery({ person, treeId, canEdit }: { person: Person; treeId: string; canEdit: boolean }) {
  const { toast } = useToast();
  const [paths, setPaths] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listMedia(person.id).then((m) =>
      setPaths(m.filter((x) => x.kind === "photo").map((x) => x.storage_path))
    );
  }, [person.id]);

  async function onUpload(file: File) {
    setBusy(true);
    try {
      const path = await uploadFile(treeId, file, `gallery/${person.id}`);
      await addMediaRecord({ tree_id: treeId, person_id: person.id, kind: "photo", storage_path: path });
      setPaths((p) => [path, ...p]);
      toast({ title: "Foto adicionada." });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <label className="flex items-center gap-2 text-sm cursor-pointer text-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar foto
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
        </label>
      )}
      {paths.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma foto na galeria.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {paths.map((p) => (
            <GalleryImg key={p} path={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryImg({ path }: { path: string }) {
  const url = useSignedUrl(path);
  return (
    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </div>
  );
}
