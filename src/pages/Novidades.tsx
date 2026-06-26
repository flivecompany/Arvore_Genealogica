import { useEffect, useState } from "react";
import { Sparkles, Lightbulb, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SuggestionForm } from "@/components/SuggestionForm";
import { useAuth } from "@/hooks/useAuth";
import {
  listFeatureUpdates,
  listSuggestions,
  FEATURE_STATUS_LABEL,
  SUGGESTION_STATUS_LABEL,
} from "@/lib/feedback";
import type {
  FeatureUpdate,
  FeatureStatus,
  Suggestion,
  SuggestionStatus,
} from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const FEATURE_PILL: Record<FeatureStatus, string> = {
  planned: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  done: "bg-success/10 text-success",
};
const SUGGESTION_PILL: Record<SuggestionStatus, string> = {
  new: "bg-primary/10 text-primary",
  planned: "bg-warning/10 text-warning",
  done: "bg-success/10 text-success",
  declined: "bg-muted text-muted-foreground",
};

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}>
      {children}
    </span>
  );
}

const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

export default function Novidades() {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<FeatureUpdate[]>([]);
  const [mine, setMine] = useState<Suggestion[]>([]);

  function reloadMine() {
    listSuggestions()
      .then((all) => setMine(all.filter((s) => s.user_id === user?.id)))
      .catch(() => {});
  }

  useEffect(() => {
    listFeatureUpdates().then(setUpdates).catch(() => {});
  }, []);
  useEffect(() => {
    if (user?.id) reloadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="container max-w-3xl px-4 py-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> Novidades & Sugestões
        </h1>
        <p className="text-muted-foreground text-sm">
          Veja o que há de novo na plataforma e envie suas ideias. Toda sugestão é lida pela equipe.
        </p>
      </header>

      {/* Lista de novos recursos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
          <Lightbulb className="h-4 w-4" /> O que há de novo
        </h2>
        {updates.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">
            Ainda não há novidades publicadas. Volte em breve!
          </Card>
        ) : (
          <div className="space-y-3">
            {updates.map((u) => (
              <Card key={u.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{u.title}</h3>
                  <Pill className={FEATURE_PILL[u.status]}>{FEATURE_STATUS_LABEL[u.status]}</Pill>
                </div>
                {u.description && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                    {u.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground mt-2">{fmtDate(u.created_at)}</div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Enviar sugestão */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
          <MessageSquare className="h-4 w-4" /> Envie uma sugestão
        </h2>
        <Card className="p-5">
          <SuggestionForm onSent={reloadMine} />
        </Card>
      </section>

      {/* Minhas sugestões */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Minhas sugestões</h2>
        {mine.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">
            Você ainda não enviou nenhuma sugestão.
          </Card>
        ) : (
          <div className="space-y-3">
            {mine.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{s.title}</h3>
                  <Pill className={SUGGESTION_PILL[s.status]}>
                    {SUGGESTION_STATUS_LABEL[s.status]}
                  </Pill>
                </div>
                {s.description && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                    {s.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground mt-2">{fmtDate(s.created_at)}</div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
