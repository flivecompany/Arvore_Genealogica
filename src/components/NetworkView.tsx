import { useMemo, useRef, useState } from "react";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
} from "d3-force";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import type { Person, Union } from "@/integrations/supabase/types";
import { fullName, initials } from "@/lib/genealogy";

interface GNode extends SimulationNodeDatum {
  id: string;
  p: Person;
}
interface GLink {
  source: string | GNode;
  target: string | GNode;
  kind: "parent" | "spouse";
}

const SEX_COLOR: Record<string, string> = {
  male: "#1498d5",
  female: "#fd4817",
  other: "#64748b",
};

/**
 * Visão de rede (grafo) com TODAS as pessoas de uma vez. Pessoas sem nenhuma
 * conexão aparecem destacadas (anel laranja tracejado) para fácil identificação.
 */
export default function NetworkView({
  people,
  unions,
  onSelect,
}: {
  people: Person[];
  unions: Union[];
  onSelect?: (id: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  // Converte coordenadas de tela para coordenadas do viewBox.
  function toView(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function zoomAt(clientX: number, clientY: number, factor: number) {
    setT((cur) => {
      const k = Math.min(8, Math.max(0.15, cur.k * factor));
      const pv = toView(clientX, clientY);
      // mantém o ponto sob o cursor fixo
      const x = pv.x - ((pv.x - cur.x) / cur.k) * k;
      const y = pv.y - ((pv.y - cur.y) / cur.k) * k;
      return { k, x, y };
    });
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }
  function onMouseDown(e: React.MouseEvent) {
    drag.current = toView(e.clientX, e.clientY);
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current) return;
    const p = toView(e.clientX, e.clientY);
    const dx = p.x - drag.current.x;
    const dy = p.y - drag.current.y;
    drag.current = p;
    setT((cur) => ({ ...cur, x: cur.x + dx, y: cur.y + dy }));
  }
  function endDrag() {
    drag.current = null;
  }
  function centerZoom(factor: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
  }

  const { nodes, links, degree, viewBox, disconnected } = useMemo(() => {
    const byId = new Set(people.map((p) => p.id));
    const nodes: GNode[] = people.map((p) => ({ id: p.id, p }));
    const links: GLink[] = [];
    const degree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
    const bump = (a: string, b: string) => {
      degree.set(a, (degree.get(a) ?? 0) + 1);
      degree.set(b, (degree.get(b) ?? 0) + 1);
    };
    for (const p of people) {
      for (const par of [p.father_id, p.mother_id]) {
        if (par && byId.has(par)) {
          links.push({ source: par, target: p.id, kind: "parent" });
          bump(par, p.id);
        }
      }
    }
    for (const u of unions) {
      if (byId.has(u.partner1_id) && byId.has(u.partner2_id)) {
        links.push({ source: u.partner1_id, target: u.partner2_id, kind: "spouse" });
        bump(u.partner1_id, u.partner2_id);
      }
    }

    const sim = forceSimulation(nodes)
      .force("charge", forceManyBody().strength(-220))
      .force(
        "link",
        forceLink<GNode, GLink>(links)
          .id((d) => d.id)
          .distance(80)
          .strength(0.7)
      )
      .force("center", forceCenter(0, 0))
      .force("collide", forceCollide(30))
      .stop();
    for (let i = 0; i < 400; i++) sim.tick();

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x ?? 0);
      minY = Math.min(minY, n.y ?? 0);
      maxX = Math.max(maxX, n.x ?? 0);
      maxY = Math.max(maxY, n.y ?? 0);
    }
    const pad = 80;
    if (!isFinite(minX)) { minX = -100; minY = -100; maxX = 100; maxY = 100; }
    const viewBox = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
    const disconnected = [...degree.values()].filter((d) => d === 0).length;
    return { nodes, links, degree, viewBox, disconnected };
  }, [people, unions]);

  const pos = (n: string | GNode) => (typeof n === "string" ? null : n);

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="px-4 py-2 text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border">
        <span>Rede de {people.length} pessoa(s)</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-muted-foreground/60" /> pai/mãe–filho
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 border-t-2 border-dashed border-female" /> cônjuge
        </span>
        <span className="flex items-center gap-1 text-warning font-medium">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-dashed border-warning" />
          {disconnected} desconectada(s)
        </span>
      </div>

      <div className="relative flex-1">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full cursor-grab active:cursor-grabbing select-none"
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
          <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
        {/* arestas */}
        {links.map((l, i) => {
          const s = pos(l.source);
          const t = pos(l.target);
          if (!s || !t) return null;
          return (
            <line
              key={i}
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke={l.kind === "spouse" ? "#fd4817" : "#94a3b8"}
              strokeWidth={1.5}
              strokeDasharray={l.kind === "spouse" ? "5 4" : undefined}
              opacity={0.7}
            />
          );
        })}
        {/* nós */}
        {nodes.map((n) => {
          const isolated = (degree.get(n.id) ?? 0) === 0;
          const color = SEX_COLOR[n.p.sex] ?? SEX_COLOR.other;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              className="cursor-pointer"
              onClick={() => onSelect?.(n.id)}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover((h) => (h === n.id ? null : h))}
            >
              <circle
                r={hover === n.id ? 22 : 19}
                fill={color}
                stroke={isolated ? "#f59e0b" : "#ffffff"}
                strokeWidth={isolated ? 3 : 2}
                strokeDasharray={isolated ? "4 3" : undefined}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize="13"
                fontWeight="600"
                style={{ pointerEvents: "none" }}
              >
                {initials(n.p)}
              </text>
              <text
                y={34}
                textAnchor="middle"
                fill="currentColor"
                fontSize="12"
                className="fill-foreground"
                style={{ pointerEvents: "none" }}
              >
                {fullName(n.p).slice(0, 22)}
              </text>
              {isolated && (
                <text y={48} textAnchor="middle" fontSize="9" className="fill-warning" style={{ pointerEvents: "none" }}>
                  desconectada
                </text>
              )}
            </g>
          );
        })}
          </g>
        </svg>

        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <button
            className="h-8 w-8 grid place-items-center rounded-md border border-border bg-background/90 shadow hover:bg-secondary"
            onClick={() => centerZoom(1.3)}
            aria-label="Aproximar"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            className="h-8 w-8 grid place-items-center rounded-md border border-border bg-background/90 shadow hover:bg-secondary"
            onClick={() => centerZoom(1 / 1.3)}
            aria-label="Afastar"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            className="h-8 w-8 grid place-items-center rounded-md border border-border bg-background/90 shadow hover:bg-secondary"
            onClick={() => setT({ k: 1, x: 0, y: 0 })}
            aria-label="Ajustar à tela"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
