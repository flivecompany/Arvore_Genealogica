import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  TreePine,
  Users,
  Heart,
  Image as ImageIcon,
  Clock,
  Link2,
  UserCog,
  Trash2,
  Plus,
  Save,
  Loader2,
  Activity,
  CalendarDays,
  UserCheck,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  isSuperadmin,
  getPlatformStats,
  getPlatformSettings,
  updatePlatformSettings,
  listSuperadmins,
  setSuperadmin,
  getAccessStats,
} from "@/lib/superadmin";
import {
  listFeatureUpdates,
  createFeatureUpdate,
  updateFeatureUpdate,
  deleteFeatureUpdate,
  listSuggestions,
  updateSuggestionStatus,
  FEATURE_STATUS_LABEL,
  SUGGESTION_STATUS_LABEL,
} from "@/lib/feedback";
import type {
  PlatformSettings,
  PlatformStats,
  Superadmin,
  AccessStats,
  FeatureUpdate,
  FeatureStatus,
  Suggestion,
  SuggestionStatus,
} from "@/integrations/supabase/types";

export default function SuperAdmin() {
  const { toast } = useToast();
  const { data: isSuper, isLoading: checking } = useQuery({
    queryKey: ["superadmin"],
    queryFn: isSuperadmin,
  });

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [supers, setSupers] = useState<Superadmin[]>([]);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [access, setAccess] = useState<AccessStats | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!isSuper) return;
    getPlatformStats().then(setStats).catch(() => {});
    getPlatformSettings().then(setSettings).catch(() => {});
    listSuperadmins().then(setSupers).catch(() => {});
  }, [isSuper]);

  useEffect(() => {
    if (!isSuper) return;
    getAccessStats(days).then(setAccess).catch(() => {});
  }, [isSuper, days]);

  if (checking) {
    return (
      <div className="container py-20 text-center text-muted-foreground">Carregando…</div>
    );
  }
  if (!isSuper) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        Acesso restrito ao superadministrador da plataforma.
      </div>
    );
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updatePlatformSettings({
        platform_name: settings.platform_name,
        support_email: settings.support_email,
        announcement: settings.announcement,
        allow_signups: settings.allow_signups,
      });
      if (updated) setSettings(updated);
      toast({ title: "Configurações salvas." });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function addSuper() {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    try {
      await setSuperadmin(email, true);
      setNewEmail("");
      setSupers(await listSuperadmins());
      toast({ title: `${email} agora é superadmin.` });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function removeSuper(email: string) {
    if (!confirm(`Remover superadmin de ${email}?`)) return;
    try {
      await setSuperadmin(email, false);
      setSupers(await listSuperadmins());
      toast({ title: "Superadmin removido." });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  }

  const metrics = [
    { label: "Árvores", value: stats?.trees, icon: TreePine },
    { label: "Pessoas", value: stats?.people, icon: Users },
    { label: "Uniões", value: stats?.unions, icon: Heart },
    { label: "Usuários", value: stats?.users, icon: UserCog },
    { label: "Mídias", value: stats?.media, icon: ImageIcon },
    { label: "Pendentes", value: stats?.pending, icon: Clock },
    { label: "Links ativos", value: stats?.share_links, icon: Link2 },
  ];

  return (
    <div className="container py-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> Superadministração
        </h1>
        <p className="text-sm text-muted-foreground">
          Configurações globais e métricas de toda a plataforma.
        </p>
      </div>

      {/* Métricas globais */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Métricas da plataforma</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className="p-3 text-center">
                <Icon className="h-4 w-4 mx-auto text-primary" />
                <div className="text-xl font-bold tabular-nums">{m.value ?? "—"}</div>
                <div className="text-[11px] text-muted-foreground">{m.label}</div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Estatísticas de acesso */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
            <Activity className="h-4 w-4" /> Acessos à plataforma
          </h2>
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={
                  "px-2.5 py-1 text-xs " +
                  (days === d ? "bg-secondary font-medium" : "hover:bg-secondary/50")
                }
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Hoje", value: access?.today, icon: Activity },
            { label: "Últimos 7 dias", value: access?.last7, icon: CalendarDays },
            { label: "Últimos 30 dias", value: access?.last30, icon: CalendarDays },
            { label: "Usuários únicos", value: access?.unique_total, icon: UserCheck },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className="p-3 text-center">
                <Icon className="h-4 w-4 mx-auto text-primary" />
                <div className="text-xl font-bold tabular-nums">{m.value ?? "—"}</div>
                <div className="text-[11px] text-muted-foreground">{m.label}</div>
              </Card>
            );
          })}
        </div>

        {/* Gráfico de barras: acessos por dia */}
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-2">
            Acessos por dia (últimos {days} dias)
          </div>
          {access && access.series.length > 0 ? (
            <AccessBars series={access.series} />
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Sem registros de acesso ainda.
            </p>
          )}
        </Card>

        {/* Top usuários */}
        <Card className="p-4 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            Usuários mais ativos ({days} dias)
          </div>
          {access && access.top_users.length > 0 ? (
            access.top_users.map((u) => (
              <div key={u.email ?? "?"} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{u.email ?? "—"}</span>
                <span className="flex items-center gap-3 shrink-0 text-muted-foreground">
                  <span className="text-foreground font-medium tabular-nums">{u.accesses}</span>
                  <span className="text-xs whitespace-nowrap">
                    {new Date(u.last_at).toLocaleDateString("pt-BR")}
                  </span>
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum acesso no período.</p>
          )}
        </Card>
      </section>

      {/* Configurações globais */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Configurações da plataforma</h2>
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nome da plataforma</Label>
              <Input
                value={settings?.platform_name ?? ""}
                onChange={(e) => setSettings((s) => (s ? { ...s, platform_name: e.target.value } : s))}
              />
            </div>
            <div className="space-y-1">
              <Label>E-mail de suporte</Label>
              <Input
                type="email"
                value={settings?.support_email ?? ""}
                onChange={(e) => setSettings((s) => (s ? { ...s, support_email: e.target.value } : s))}
                placeholder="suporte@flivecompany.com"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Aviso global (aparece no topo para todos)</Label>
            <Textarea
              rows={2}
              value={settings?.announcement ?? ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, announcement: e.target.value } : s))}
              placeholder="Ex.: Manutenção programada no domingo às 20h."
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="font-medium text-sm">Permitir novos cadastros</div>
              <div className="text-xs text-muted-foreground">
                Quando desligado, novos usuários não conseguem criar conta.
              </div>
            </div>
            <Switch
              checked={settings?.allow_signups ?? true}
              onCheckedChange={(v) => setSettings((s) => (s ? { ...s, allow_signups: v } : s))}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving || !settings}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar configurações
            </Button>
          </div>
        </Card>
      </section>

      {/* Superadmins */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Superadministradores</h2>
        <Card className="p-4 space-y-3">
          {supers.map((s) => (
            <div key={s.email} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="secondary" className="shrink-0">super</Badge>
                <span className="truncate text-sm">{s.email}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => removeSuper(s.email)}
                aria-label="Remover superadmin"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {supers.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum superadmin cadastrado.</p>
          )}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSuper()}
            />
            <Button onClick={addSuper} disabled={!newEmail.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
        </Card>
      </section>

      {/* Novidades (gerenciar a lista de novos recursos) */}
      <NovidadesAdmin />

      {/* Sugestões dos usuários (triagem) */}
      <SuggestionsAdmin />
    </div>
  );
}

/** Gerência das novidades / novos recursos (somente superadmin). */
function NovidadesAdmin() {
  const { toast } = useToast();
  const [items, setItems] = useState<FeatureUpdate[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<FeatureStatus>("planned");
  const [adding, setAdding] = useState(false);

  function reload() {
    listFeatureUpdates().then(setItems).catch(() => {});
  }
  useEffect(reload, []);

  async function add() {
    if (!title.trim()) return;
    setAdding(true);
    try {
      await createFeatureUpdate({ title, description, status });
      setTitle("");
      setDescription("");
      setStatus("planned");
      reload();
      toast({ title: "Novidade publicada." });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  async function patch(id: string, p: Partial<FeatureUpdate>) {
    try {
      await updateFeatureUpdate(id, p);
      reload();
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function remove(id: string) {
    if (!confirm("Remover esta novidade?")) return;
    try {
      await deleteFeatureUpdate(id);
      reload();
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
        <Sparkles className="h-4 w-4" /> Novidades / novos recursos
      </h2>

      {/* Adicionar */}
      <Card className="p-4 space-y-3">
        <div className="space-y-1">
          <Label>Título</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Exportação em GEDCOM"
            maxLength={120}
          />
        </div>
        <div className="space-y-1">
          <Label>Descrição (opcional)</Label>
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="O que mudou ou está por vir."
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as FeatureStatus)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FEATURE_STATUS_LABEL) as FeatureStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {FEATURE_STATUS_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={add} disabled={adding || !title.trim()} className="ml-auto">
            {adding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Publicar
          </Button>
        </div>
      </Card>

      {/* Lista */}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma novidade cadastrada.</p>
      ) : (
        items.map((it) => (
          <Card key={it.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{it.title}</div>
                {it.description && (
                  <div className="text-sm text-muted-foreground whitespace-pre-line">
                    {it.description}
                  </div>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive shrink-0"
                onClick={() => remove(it.id)}
                aria-label="Remover novidade"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={it.status} onValueChange={(v) => patch(it.id, { status: v as FeatureStatus })}>
                <SelectTrigger className="w-48 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FEATURE_STATUS_LABEL) as FeatureStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {FEATURE_STATUS_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={it.published}
                  onCheckedChange={(v) => patch(it.id, { published: v })}
                />
                Publicada
              </label>
            </div>
          </Card>
        ))
      )}
    </section>
  );
}

/** Triagem das sugestões enviadas pelos usuários (somente superadmin). */
function SuggestionsAdmin() {
  const { toast } = useToast();
  const [items, setItems] = useState<Suggestion[]>([]);

  function reload() {
    listSuggestions().then(setItems).catch(() => {});
  }
  useEffect(reload, []);

  async function setStatus(id: string, status: SuggestionStatus) {
    try {
      await updateSuggestionStatus(id, status);
      reload();
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
        <MessageSquare className="h-4 w-4" /> Sugestões dos usuários ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma sugestão recebida ainda.</p>
      ) : (
        items.map((s) => (
          <Card key={s.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{s.title}</div>
                {s.description && (
                  <div className="text-sm text-muted-foreground whitespace-pre-line">
                    {s.description}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {s.email ?? "—"} · {new Date(s.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <Select value={s.status} onValueChange={(v) => setStatus(s.id, v as SuggestionStatus)}>
                <SelectTrigger className="w-40 h-8 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SUGGESTION_STATUS_LABEL) as SuggestionStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SUGGESTION_STATUS_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        ))
      )}
    </section>
  );
}

/** Gráfico de barras simples (CSS) dos acessos por dia. */
function AccessBars({ series }: { series: AccessStats["series"] }) {
  const max = Math.max(1, ...series.map((s) => s.accesses));
  const step = Math.ceil(series.length / 8); // ~8 rótulos no eixo X
  return (
    <div className="flex items-end gap-[2px] h-32">
      {series.map((s, i) => {
        const d = new Date(s.day + "T00:00:00");
        const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        return (
          <div key={s.day} className="flex-1 h-full flex flex-col justify-end items-center group">
            <div
              className="w-full rounded-t bg-primary/80 group-hover:bg-primary transition-colors min-h-[2px]"
              style={{ height: `${(s.accesses / max) * 100}%` }}
              title={`${label}: ${s.accesses} acesso(s) · ${s.users} usuário(s)`}
            />
            <span className="mt-1 text-[8px] text-muted-foreground h-3 leading-3">
              {i % step === 0 ? label : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
