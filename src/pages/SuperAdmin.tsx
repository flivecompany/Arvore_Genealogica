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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  isSuperadmin,
  getPlatformStats,
  getPlatformSettings,
  updatePlatformSettings,
  listSuperadmins,
  setSuperadmin,
} from "@/lib/superadmin";
import type { PlatformSettings, PlatformStats, Superadmin } from "@/integrations/supabase/types";

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

  useEffect(() => {
    if (!isSuper) return;
    getPlatformStats().then(setStats).catch(() => {});
    getPlatformSettings().then(setSettings).catch(() => {});
    listSuperadmins().then(setSupers).catch(() => {});
  }, [isSuper]);

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
    </div>
  );
}
