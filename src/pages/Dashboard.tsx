import { useQuery } from "@tanstack/react-query";
import {
  Users,
  HeartPulse,
  Cross,
  Heart,
  Image as ImageIcon,
  FileText,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTree } from "@/hooks/useTree";
import { useTreeData } from "@/hooks/useTreeData";
import { getTreeStats } from "@/lib/people";
import { ancestorsOf } from "@/lib/genealogy";

export default function Dashboard() {
  const { activeTree } = useTree();
  const { people } = useTreeData(activeTree?.id);

  const { data: stats } = useQuery({
    queryKey: ["stats", activeTree?.id],
    queryFn: () => getTreeStats(activeTree!.id),
    enabled: !!activeTree,
  });

  // Gerações mapeadas = profundidade máxima de ancestralidade + 1
  const generations = (() => {
    let max = 0;
    for (const p of people) max = Math.max(max, ancestorsOf(p.id, people).size);
    return people.length ? max + 1 : 0;
  })();

  const cards = [
    { label: "Pessoas", value: stats?.people ?? 0, icon: Users, color: "text-primary" },
    { label: "Vivos", value: stats?.living ?? 0, icon: HeartPulse, color: "text-success" },
    { label: "Falecidos", value: stats?.deceased ?? 0, icon: Cross, color: "text-muted-foreground" },
    { label: "Uniões", value: stats?.unions ?? 0, icon: Heart, color: "text-female" },
    { label: "Gerações", value: generations, icon: Layers, color: "text-accent" },
    { label: "Fotos", value: stats?.photos ?? 0, icon: ImageIcon, color: "text-primary" },
    { label: "Documentos", value: stats?.documents ?? 0, icon: FileText, color: "text-accent" },
  ];

  const maxSurname = Math.max(1, ...(stats?.surnames ?? []).map((s) => s.total));
  const maxDecade = Math.max(1, ...(stats?.birth_decades ?? []).map((d) => d.total));

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel</h1>
        <p className="text-sm text-muted-foreground">{activeTree?.name}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-4">
              <Icon className={`h-5 w-5 ${c.color}`} />
              <div className="text-2xl font-bold mt-2">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Sobrenomes mais comuns</h2>
          <div className="space-y-2">
            {(stats?.surnames ?? []).map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="w-32 truncate text-sm">{s.name}</span>
                <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-flive rounded-full"
                    style={{ width: `${(s.total / maxSurname) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-6 text-right">{s.total}</span>
              </div>
            ))}
            {(!stats?.surnames || stats.surnames.length === 0) && (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-3">Nascimentos por década</h2>
          <div className="flex items-end gap-2 h-40">
            {(stats?.birth_decades ?? []).map((d) => (
              <div key={d.decade} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div
                  className="w-full bg-primary/80 rounded-t"
                  style={{ height: `${(d.total / maxDecade) * 100}%` }}
                  title={`${d.total} pessoa(s)`}
                />
                <span className="text-[10px] text-muted-foreground">{d.decade}</span>
              </div>
            ))}
            {(!stats?.birth_decades || stats.birth_decades.length === 0) && (
              <p className="text-sm text-muted-foreground">Sem datas de nascimento.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
