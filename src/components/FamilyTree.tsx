import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import f3 from "family-chart";
import "family-chart/styles/family-chart.css";
import type { Person, Union } from "@/integrations/supabase/types";
import { toFamilyChartData, pickRootId } from "@/lib/genealogy";
import { signedUrl } from "@/lib/storage";

interface FamilyTreeProps {
  people: Person[];
  unions: Union[];
  /** id da pessoa em foco (raiz visual). */
  focusId?: string | null;
  /** ids destacados (busca / ancestrais / descendentes). */
  highlight?: Set<string>;
  onSelect?: (personId: string) => void;
  className?: string;
}

/**
 * Organograma genealógico interativo (zoom, pan, expandir/recolher),
 * construído sobre o family-chart (D3). Cartões mostram foto, nome e período
 * de vida; cor da borda indica o sexo.
 */
export default function FamilyTree({
  people,
  unions,
  focusId,
  highlight,
  onSelect,
  className,
}: FamilyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [avatarUrls, setAvatarUrls] = useState<Map<string, string>>(new Map());

  // Resolve URLs (assinadas) das fotos do Storage; sem foto usa-se o placeholder.
  useEffect(() => {
    let active = true;
    const withPhotos = people.filter((p) => p.avatar_url);
    if (withPhotos.length === 0) {
      setAvatarUrls((prev) => (prev.size ? new Map() : prev));
      return;
    }
    Promise.all(
      withPhotos.map(async (p) => [p.id, await signedUrl(p.avatar_url!)] as const)
    ).then((entries) => {
      if (!active) return;
      const m = new Map<string, string>();
      for (const [id, url] of entries) if (url) m.set(id, url);
      setAvatarUrls(m);
    });
    return () => {
      active = false;
    };
  }, [people]);

  // (Re)cria o gráfico quando os dados mudam.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || people.length === 0) return;
    el.innerHTML = "";

    const data = toFamilyChartData(people, unions, avatarUrls);
    const mainId =
      focusId && data.some((d) => d.id === focusId)
        ? focusId
        : pickRootId(people, unions) ?? data[0]?.id;

    const chart: any = f3
      .createChart(el, data)
      .setTransitionTime(700)
      .setCardXSpacing(260)
      .setCardYSpacing(170)
      .setOrientationVertical()
      .setSingleParentEmptyCard(false);

    if (mainId) chart.updateMainId(mainId);

    const card = chart
      .setCard(f3.CardHtml)
      .setCardDisplay([["first name", "last name"], ["birthday"]])
      .setCardDim({ w: 210, h: 70, img_w: 56, img_h: 56, img_x: 8, img_y: 7 })
      .setMiniTree(true)
      .setStyle("imageRect")
      .setOnHoverPathToMain();

    card.setOnCardClick((_e: unknown, d: any) => {
      const id = d?.data?.id;
      if (id && onSelectRef.current) onSelectRef.current(id);
      // recentraliza no clicado
      chart.updateMainId(id);
      chart.updateTree({});
    });

    chartRef.current = chart;
    chart.updateTree({ initial: true });

    return () => {
      el.innerHTML = "";
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, unions, avatarUrls]);

  // Recentraliza quando focusId muda externamente (busca).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !focusId) return;
    try {
      chart.updateMainId(focusId);
      chart.updateTree({});
    } catch {
      /* noop */
    }
  }, [focusId]);

  // Aplica destaque (classe CSS) aos cartões selecionados.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-id]");
    cards.forEach((c) => {
      const id = c.getAttribute("data-id");
      const on = highlight && id ? highlight.has(id) : false;
      c.classList.toggle("genea-dim", !!highlight && highlight.size > 0 && !on);
      c.classList.toggle("genea-glow", !!on);
    });
  }, [highlight, people]);

  // Zoom por botão: dispara um evento de roda no centro do SVG, reaproveitando
  // o comportamento de zoom (d3) que o family-chart já controla.
  function zoomStep(zoomIn: boolean) {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    svg.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: zoomIn ? -260 : 260,
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2,
        bubbles: true,
        cancelable: true,
      })
    );
  }

  function fitScreen() {
    try {
      chartRef.current?.updateTree({ initial: true });
    } catch {
      /* noop */
    }
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <div ref={containerRef} className="f3 w-full h-full" />
      {people.length > 0 && (
        <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1">
          <button
            className="h-9 w-9 grid place-items-center rounded-md border border-primary bg-primary text-primary-foreground shadow hover:bg-primary/90"
            onClick={() => zoomStep(true)}
            aria-label="Aproximar"
            title="Aproximar"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            className="h-9 w-9 grid place-items-center rounded-md border border-primary bg-primary text-primary-foreground shadow hover:bg-primary/90"
            onClick={() => zoomStep(false)}
            aria-label="Afastar"
            title="Afastar"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            className="h-9 w-9 grid place-items-center rounded-md border border-primary bg-primary text-primary-foreground shadow hover:bg-primary/90"
            onClick={fitScreen}
            aria-label="Ajustar à tela"
            title="Ajustar à tela"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
