import type { Person, Union, UnionStatus } from "@/integrations/supabase/types";

/** Rótulo da situação da união, em pt-BR. */
export const UNION_STATUS_LABEL: Record<UnionStatus, string> = {
  married: "Casado(a)",
  partners: "União estável",
  separated: "Separado(a)",
  divorced: "Divorciado(a)",
  widowed: "Viúvo(a)",
};

/** Situações que indicam vínculo encerrado (ex-cônjuge). */
export const FORMER_UNION_STATUSES: ReadonlySet<UnionStatus> = new Set<UnionStatus>([
  "separated",
  "divorced",
  "widowed",
]);

export function isFormerUnion(u: Pick<Union, "status">): boolean {
  return FORMER_UNION_STATUSES.has(u.status);
}

/** Nome completo legível. */
export function fullName(p: Pick<Person, "first_name" | "last_name">): string {
  return [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
}

export function initials(p: Pick<Person, "first_name" | "last_name">): string {
  const a = p.first_name?.[0] ?? "";
  const b = p.last_name?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

function year(date: string | null, text: string | null): string {
  if (date) return new Date(date + "T00:00:00").getFullYear().toString();
  if (text) {
    const m = text.match(/\d{4}/);
    if (m) return m[0];
  }
  return "";
}

/** "1890 – 1970" / "n. 1990" / "" */
export function lifeSpan(p: Person): string {
  const b = year(p.birth_date, p.birth_date_text);
  const d = year(p.death_date, p.death_date_text);
  if (b && d) return `${b} – ${d}`;
  if (b) return p.is_living ? `n. ${b}` : `${b} – ?`;
  if (d) return `? – ${d}`;
  return p.is_living ? "" : "falecido(a)";
}

/** Data por extenso em pt-BR ("12 de março de 1990"). */
export function formatDate(date: string | null, text: string | null): string {
  if (date) {
    return new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
  return text ?? "";
}

/** Idade (ou idade ao falecer). */
export function ageOf(p: Person): number | null {
  if (!p.birth_date) return null;
  const birth = new Date(p.birth_date + "T00:00:00");
  const end = p.death_date ? new Date(p.death_date + "T00:00:00") : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

// ---------------------------------------------------------------------------
// Transformação para o formato do family-chart
// ---------------------------------------------------------------------------
export interface FamilyChartNode {
  id: string;
  data: Record<string, string | undefined> & { gender: "M" | "F" };
  rels: {
    parents: string[];
    spouses: string[];
    children: string[];
  };
}

// Avatar de fallback (iniciais sobre cor por sexo) como data-URI SVG,
// evitando o ícone de "imagem quebrada" quando não há foto.
export function avatarPlaceholder(
  p: Pick<Person, "first_name" | "last_name" | "sex">
): string {
  const bg = p.sex === "female" ? "#fd4817" : p.sex === "male" ? "#1498d5" : "#64748b";
  const text = initials(p);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>` +
    `<rect width='120' height='120' fill='${bg}'/>` +
    `<text x='60' y='62' font-size='46' fill='#ffffff' text-anchor='middle' ` +
    `dominant-baseline='central' font-family='Inter,Arial,sans-serif' ` +
    `font-weight='600'>${text}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function toFamilyChartData(
  people: Person[],
  unions: Union[],
  avatarUrls?: Map<string, string>
): FamilyChartNode[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const childrenOf = new Map<string, Set<string>>();
  for (const p of people) {
    for (const parent of [p.father_id, p.mother_id]) {
      if (parent && byId.has(parent)) {
        if (!childrenOf.has(parent)) childrenOf.set(parent, new Set());
        childrenOf.get(parent)!.add(p.id);
      }
    }
  }
  const spousesOf = new Map<string, Set<string>>();
  for (const u of unions) {
    if (!byId.has(u.partner1_id) || !byId.has(u.partner2_id)) continue;
    if (!spousesOf.has(u.partner1_id)) spousesOf.set(u.partner1_id, new Set());
    if (!spousesOf.has(u.partner2_id)) spousesOf.set(u.partner2_id, new Set());
    spousesOf.get(u.partner1_id)!.add(u.partner2_id);
    spousesOf.get(u.partner2_id)!.add(u.partner1_id);
  }

  return people.map((p) => {
    const parents: string[] = [];
    if (p.father_id && byId.has(p.father_id)) parents.push(p.father_id);
    if (p.mother_id && byId.has(p.mother_id)) parents.push(p.mother_id);
    return {
      id: p.id,
      data: {
        "first name": p.first_name,
        "last name": p.last_name ?? "",
        gender: p.sex === "female" ? "F" : "M",
        avatar: avatarUrls?.get(p.id) || avatarPlaceholder(p),
        birthday: lifeSpan(p),
        label: fullName(p),
        deceased: p.is_living ? undefined : "1",
      },
      rels: {
        parents,
        spouses: [...(spousesOf.get(p.id) ?? [])],
        children: [...(childrenOf.get(p.id) ?? [])],
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Ancestrais / descendentes (destaque visual)
// ---------------------------------------------------------------------------
export function ancestorsOf(id: string, people: Person[]): Set<string> {
  const byId = new Map(people.map((p) => [p.id, p]));
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = byId.get(stack.pop()!);
    if (!cur) continue;
    for (const parent of [cur.father_id, cur.mother_id]) {
      if (parent && !out.has(parent)) {
        out.add(parent);
        stack.push(parent);
      }
    }
  }
  return out;
}

export function descendantsOf(id: string, people: Person[]): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const p of people) {
    for (const parent of [p.father_id, p.mother_id]) {
      if (parent) {
        if (!childrenOf.has(parent)) childrenOf.set(parent, []);
        childrenOf.get(parent)!.push(p.id);
      }
    }
  }
  const out = new Set<string>();
  const stack = [...(childrenOf.get(id) ?? [])];
  while (stack.length) {
    const cur = stack.pop()!;
    if (out.has(cur)) continue;
    out.add(cur);
    stack.push(...(childrenOf.get(cur) ?? []));
  }
  return out;
}

// Adjacência não-direcionada (pais/filhos + cônjuges)
function buildAdjacency(people: Person[], unions: Union[]): Map<string, Set<string>> {
  const byId = new Set(people.map((p) => p.id));
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const p of people) {
    for (const par of [p.father_id, p.mother_id]) {
      if (par && byId.has(par)) {
        link(p.id, par);
        link(par, p.id);
      }
    }
  }
  for (const u of unions) {
    if (byId.has(u.partner1_id) && byId.has(u.partner2_id)) {
      link(u.partner1_id, u.partner2_id);
      link(u.partner2_id, u.partner1_id);
    }
  }
  return adj;
}

function componentRoot(ids: string[], people: Person[]): string {
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const idSet = new Set(ids);
  const roots = ids.filter((id) => {
    const p = peopleById.get(id);
    return p && !p.father_id && !p.mother_id;
  });
  const pool = roots.length ? roots : ids;
  let bestId = pool[0];
  let bestCount = -1;
  for (const id of pool) {
    const c = [...descendantsOf(id, people)].filter((d) => idSet.has(d)).length;
    if (c > bestCount) {
      bestCount = c;
      bestId = id;
    }
  }
  return bestId;
}

export interface FamilyGroup {
  rootId: string;
  label: string;
  size: number;
}

/** Lista os grupos familiares separados (componentes conectados), maior primeiro. */
export function connectedGroups(people: Person[], unions: Union[]): FamilyGroup[] {
  const adj = buildAdjacency(people, unions);
  const seen = new Set<string>();
  const groups: FamilyGroup[] = [];
  for (const p of people) {
    if (seen.has(p.id)) continue;
    const comp: string[] = [];
    const stack = [p.id];
    while (stack.length) {
      const c = stack.pop()!;
      if (seen.has(c)) continue;
      seen.add(c);
      comp.push(c);
      for (const n of adj.get(c) ?? []) if (!seen.has(n)) stack.push(n);
    }
    const rootId = componentRoot(comp, people);
    const root = people.find((x) => x.id === rootId);
    groups.push({
      rootId,
      label: root ? `Família de ${fullName(root)}` : "Grupo",
      size: comp.length,
    });
  }
  return groups.sort((a, b) => b.size - a.size);
}

/**
 * Escolhe a melhor pessoa para ser a raiz visual do organograma: o ancestral
 * do topo (sem pais) do MAIOR grupo conectado, com mais descendentes.
 */
export function pickRootId(people: Person[], unions: Union[]): string | null {
  if (people.length === 0) return null;
  return connectedGroups(people, unions)[0]?.rootId ?? null;
}

// ---------------------------------------------------------------------------
// Grau de parentesco (em pt-BR) entre `root` e `target`
// ---------------------------------------------------------------------------
function depthMap(id: string, people: Person[]): Map<string, number> {
  // distância (gerações) de `id` até cada um de seus ancestrais (0 = ele mesmo)
  const byId = new Map(people.map((p) => [p.id, p]));
  const dist = new Map<string, number>([[id, 0]]);
  const queue: string[] = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = dist.get(cur)!;
    const node = byId.get(cur);
    if (!node) continue;
    for (const parent of [node.father_id, node.mother_id]) {
      if (parent && !dist.has(parent)) {
        dist.set(parent, d + 1);
        queue.push(parent);
      }
    }
  }
  return dist;
}

const ASC = ["", "pai/mãe", "avô(ó)", "bisavô(ó)", "trisavô(ó)"];
const DESC = ["", "filho(a)", "neto(a)", "bisneto(a)", "trisneto(a)"];

function greats(prefix: string, n: number, base: string): string {
  // n extra "tatara"/"bis" — versão simplificada
  if (n <= 4) return base;
  return `${"tatara".repeat(n - 3)}${prefix}`;
}

/** Rótulo do parentesco de `targetId` em relação a `rootId`. */
export function kinship(
  rootId: string,
  targetId: string,
  people: Person[],
  unions: Union[]
): string {
  if (rootId === targetId) return "você / raiz";

  // cônjuge direto?
  const spouse = unions.some(
    (u) =>
      (u.partner1_id === rootId && u.partner2_id === targetId) ||
      (u.partner2_id === rootId && u.partner1_id === targetId)
  );
  if (spouse) return "cônjuge";

  const A = depthMap(rootId, people); // ancestrais da raiz
  const B = depthMap(targetId, people); // ancestrais do alvo

  // ancestral comum mais próximo (menor soma de distâncias)
  let best: { common: string; a: number; b: number } | null = null;
  for (const [anc, da] of A) {
    const db = B.get(anc);
    if (db === undefined) continue;
    if (!best || da + db < best.a + best.b) best = { common: anc, a: da, b: db };
  }
  if (!best) return "sem parentesco direto";

  const { a, b } = best;

  // linha reta ascendente / descendente
  if (a === 0) return greats("avô(ó)", b, DESC[b] ?? `descendente (${b}ª ger.)`);
  if (b === 0) return greats("avô(ó)", a, ASC[a] ?? `ancestral (${a}ª ger.)`);

  // irmãos
  if (a === 1 && b === 1) return "irmão(ã)";

  // tio/sobrinho
  if (a === 1) return b === 2 ? "sobrinho(a)" : `sobrinho(a)-${b - 1}º grau`;
  if (b === 1) return a === 2 ? "tio(a)" : `tio(a)-avô(ó)`;

  // primos
  const grau = Math.min(a, b) - 1;
  const removido = Math.abs(a - b);
  let label = grau === 1 ? "primo(a)" : `primo(a) de ${grau}º grau`;
  if (removido > 0) label += ` (${removido}º removido)`;
  return label;
}
