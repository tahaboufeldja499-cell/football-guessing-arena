import type { Footballer } from "./types";

export type Pack = "stars" | "legends" | "algeria" | "arab";
export const PACKS: { id: Pack; title: string; hint: string }[] = [
  { id: "stars", title: "النجوم الحاليون", hint: "لاعبون نشطون" },
  { id: "legends", title: "الأساطير", hint: "معتزلون فقط" },
  { id: "algeria", title: "الجزائريون", hint: "حاليون وأساطير" },
  { id: "arab", title: "العرب", hint: "حاليون وأساطير" },
];
const ARAB = new Set(["الجزائر", "مصر", "المغرب", "السعودية", "تونس", "الأردن", "العراق", "سوريا", "لبنان", "ليبيا", "الإمارات", "قطر", "الكويت", "عُمان", "اليمن", "فلسطين", "السودان", "موريتانيا"]);

/** اللاعب يمكن أن ينتمي لأكثر من حزمة (مثل الجزائري الأسطورة: legends + algeria + arab). */
export function packsOf(f: Footballer): Pack[] {
  const p: Pack[] = [f.is_legend ? "legends" : "stars"];
  if (f.nationality === "الجزائر") p.push("algeria");
  if (ARAB.has(f.nationality)) p.push("arab");
  return p;
}
export const inPacks = (f: Footballer, sel: Pack[]) => packsOf(f).some((x) => sel.includes(x));
