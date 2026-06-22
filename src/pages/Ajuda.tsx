import {
  Shield,
  Pencil,
  Eye,
  Network,
  UserPlus,
  Share2,
  Bell,
  Search,
  Download,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_DESC } from "@/lib/roles";

const ROLES = [
  {
    key: "admin" as const,
    label: "Administrador",
    icon: Shield,
    color: "text-primary",
    can: ["Editar tudo na árvore", "Gerenciar membros e papéis", "Aprovar solicitações de acesso", "Gerar convites e links de compartilhamento", "Ver auditoria"],
    cannot: [],
  },
  {
    key: "editor" as const,
    label: "Gestor",
    icon: Pencil,
    color: "text-accent",
    can: ["Adicionar, editar e vincular pessoas", "Enviar fotos e documentos"],
    cannot: ["Gerenciar membros", "Aprovar acessos", "Gerar convites"],
  },
  {
    key: "viewer" as const,
    label: "Visualizador",
    icon: Eye,
    color: "text-muted-foreground",
    can: ["Visualizar a árvore e os perfis", "Exportar PDF/PNG"],
    cannot: ["Editar qualquer informação"],
  },
];

const STEPS = [
  { icon: UserPlus, title: "Cadastrar pessoas", desc: "Use o botão “Adicionar pessoa” na árvore, ou abra um cartão e adicione pai, mãe, cônjuge ou filho — já vinculados." },
  { icon: Network, title: "Navegar na árvore", desc: "Arraste para mover, role para dar zoom e clique num cartão para ver detalhes. Use Ancestrais/Descendentes para destacar linhagens." },
  { icon: Search, title: "Buscar e filtrar", desc: "Em “Pessoas”, filtre por nome, cidade, ano, sexo e situação. Na árvore, a busca centraliza a pessoa." },
  { icon: Share2, title: "Compartilhar", desc: "Em “Compartilhar”: link somente-leitura (sem login) ou convite de edição (com aprovação)." },
  { icon: Bell, title: "Aprovar acessos", desc: "Quando alguém pede acesso de edição, o administrador recebe uma notificação no sino e aprova com 1 clique." },
  { icon: Download, title: "Exportar", desc: "Baixe a árvore em PDF, imagem (PNG) ou GEDCOM (padrão de genealogia)." },
];

export default function Ajuda() {
  return (
    <div className="container py-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Como usar a plataforma</h1>
        <p className="text-sm text-muted-foreground">
          Guia rápido da Árvore Genealógica e dos níveis de acesso.
        </p>
      </div>

      {/* Papéis */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Níveis de acesso</h2>
        <p className="text-sm text-muted-foreground">
          A diferença principal: o <strong>Administrador</strong> <em>gerencia</em> a
          árvore (pessoas, membros, aprovações e compartilhamento); o{" "}
          <strong>Gestor</strong> apenas <em>edita o conteúdo</em> (pessoas), sem
          gerenciar acessos.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <Card key={r.key} className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${r.color}`} />
                  <span className="font-semibold">{r.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{ROLE_DESC[r.key]}</p>
                <div className="space-y-1">
                  {r.can.map((c) => (
                    <div key={c} className="text-xs flex gap-1.5">
                      <span className="text-success">✓</span> {c}
                    </div>
                  ))}
                  {r.cannot.map((c) => (
                    <div key={c} className="text-xs flex gap-1.5 text-muted-foreground">
                      <span className="text-destructive">✕</span> {c}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
        <Card className="p-3 text-xs text-muted-foreground">
          O <strong>dono</strong> da árvore (quem a criou) é sempre Administrador e não
          pode ser rebaixado. <Badge variant="secondary" className="ml-1">Administrador (dono)</Badge>
        </Card>
      </section>

      {/* Como usar */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Primeiros passos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.title} className="p-4 flex gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-flive grid place-items-center shrink-0">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-medium text-sm">{s.title}</div>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Colaboração */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Colaboração com aprovação</h2>
        <Card className="p-4 text-sm space-y-2">
          <p>1. O <strong>Administrador</strong> gera um <strong>convite de edição</strong> (em Compartilhar) e envia o link.</p>
          <p>2. A pessoa abre o link, <strong>faz login</strong> e fica <strong>pendente</strong> (já pode visualizar).</p>
          <p>3. O Administrador recebe a solicitação no <strong>sino de notificações</strong> e clica em <strong>Aprovar</strong>.</p>
          <p>4. A pessoa vira <strong>Gestor</strong> e passa a <strong>editar livremente</strong> — sem aprovar cada alteração.</p>
          <p className="text-muted-foreground text-xs">
            Quem está pendente pode reenviar o pedido pelo sino, em “Solicitar aprovação”.
          </p>
        </Card>
      </section>
    </div>
  );
}
