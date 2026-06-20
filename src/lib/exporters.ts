import type { Person, Union } from "@/integrations/supabase/types";
import { fullName } from "./genealogy";

/** Captura um elemento do DOM como canvas de alta resolução. */
async function capture(el: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");
  return html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
    logging: false,
  });
}

export async function exportPng(el: HTMLElement, fileName = "arvore.png") {
  const canvas = await capture(el);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export async function exportPdf(el: HTMLElement, title = "Árvore Genealógica") {
  const { default: jsPDF } = await import("jspdf");
  const canvas = await capture(el);
  const img = canvas.toDataURL("image/png");
  const orientation = canvas.width >= canvas.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 3;
  const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;

  pdf.setFontSize(14);
  pdf.text(title, margin, margin + 4);
  pdf.addImage(img, "PNG", margin, margin + 16, w, h);
  pdf.setFontSize(8);
  pdf.text(
    `Gerado pela Árvore Genealógica · Flive — ${new Date().toLocaleDateString("pt-BR")}`,
    margin,
    pageH - 16
  );
  pdf.save(`${title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

// ---------------------------------------------------------------------------
// GEDCOM 5.5.1 — padrão de intercâmbio genealógico (export)
// ---------------------------------------------------------------------------
function gedDate(date: string | null, text: string | null): string | null {
  if (date) {
    const d = new Date(date + "T00:00:00");
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  return text;
}

export function toGedcom(people: Person[], unions: Union[], treeName = "Família"): string {
  const idx = new Map(people.map((p, i) => [p.id, `I${i + 1}`]));
  const lines: string[] = [
    "0 HEAD",
    "1 SOUR ArvoreGenealogicaFlive",
    "2 NAME Árvore Genealógica · Flive",
    "1 GEDC",
    "2 VERS 5.5.1",
    "2 FORM LINEAGE-LINKED",
    "1 CHAR UTF-8",
    `1 NOTE ${treeName}`,
  ];

  // Famílias = uniões + grupos pai/mãe->filhos
  type Fam = { husb?: string; wife?: string; chil: Set<string> };
  const fams = new Map<string, Fam>();
  const famKey = (a?: string | null, b?: string | null) =>
    [a ?? "_", b ?? "_"].sort().join("|");

  for (const u of unions) {
    const key = famKey(u.partner1_id, u.partner2_id);
    if (!fams.has(key)) fams.set(key, { chil: new Set() });
    const f = fams.get(key)!;
    f.husb = u.partner1_id;
    f.wife = u.partner2_id;
  }
  for (const p of people) {
    if (!p.father_id && !p.mother_id) continue;
    const key = famKey(p.father_id, p.mother_id);
    if (!fams.has(key)) fams.set(key, { chil: new Set() });
    const f = fams.get(key)!;
    if (p.father_id) f.husb = p.father_id;
    if (p.mother_id) f.wife = p.mother_id;
    f.chil.add(p.id);
  }

  // Indivíduos
  for (const p of people) {
    const id = idx.get(p.id)!;
    lines.push(`0 @${id}@ INDI`);
    lines.push(`1 NAME ${p.first_name} /${p.last_name ?? ""}/`);
    lines.push(`1 SEX ${p.sex === "female" ? "F" : p.sex === "male" ? "M" : "U"}`);
    const bd = gedDate(p.birth_date, p.birth_date_text);
    if (bd || p.birth_place) {
      lines.push("1 BIRT");
      if (bd) lines.push(`2 DATE ${bd}`);
      if (p.birth_place) lines.push(`2 PLAC ${p.birth_place}`);
    }
    const dd = gedDate(p.death_date, p.death_date_text);
    if (!p.is_living || dd || p.death_place) {
      lines.push("1 DEAT");
      if (dd) lines.push(`2 DATE ${dd}`);
      if (p.death_place) lines.push(`2 PLAC ${p.death_place}`);
    }
    if (p.occupation) lines.push(`1 OCCU ${p.occupation}`);
    if (p.biography) lines.push(`1 NOTE ${p.biography.replace(/\n/g, " ")}`);
  }

  // Famílias
  let fi = 0;
  for (const f of fams.values()) {
    fi++;
    lines.push(`0 @F${fi}@ FAM`);
    if (f.husb && idx.has(f.husb)) lines.push(`1 HUSB @${idx.get(f.husb)}@`);
    if (f.wife && idx.has(f.wife)) lines.push(`1 WIFE @${idx.get(f.wife)}@`);
    for (const c of f.chil) if (idx.has(c)) lines.push(`1 CHIL @${idx.get(c)}@`);
  }

  lines.push("0 TRLR");
  return lines.join("\n");
}

export function downloadGedcom(people: Person[], unions: Union[], treeName = "familia") {
  const blob = new Blob([toGedcom(people, unions, treeName)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${treeName.replace(/\s+/g, "-").toLowerCase()}.ged`;
  a.click();
  URL.revokeObjectURL(url);
}

export function fullNameList(people: Person[]): string[] {
  return people.map(fullName);
}
