import { useEffect, useRef } from "react";
import f3 from "family-chart";
import "family-chart/styles/family-chart.css";
import type { Person, Union } from "@/integrations/supabase/types";
import { toFamilyChartData } from "@/lib/genealogy";

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

  // (Re)cria o gráfico quando os dados mudam.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || people.length === 0) return;
    el.innerHTML = "";

    const data = toFamilyChartData(people, unions);
    const mainId =
      focusId && data.some((d) => d.id === focusId) ? focusId : data[0]?.id;

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
  }, [people, unions]);

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

  return <div ref={containerRef} className={`f3 ${className ?? ""}`} />;
}
