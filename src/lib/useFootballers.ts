"use client";
import { useEffect, useState } from "react";
import { FOOTBALLERS } from "@/data/footballers";
import type { Footballer } from "./types";

/** بيانات اللاعبين محليًا (بدون Supabase). إن وُجد public/players/ATTRIBUTION.json تُربط الصور تلقائيًا. */
export function useFootballers(): Footballer[] {
  const [list, setList] = useState<Footballer[]>(FOOTBALLERS);
  useEffect(() => {
    let alive = true;
    fetch("/players/ATTRIBUTION.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((a: { name_en: string; file: string }[]) => {
        if (!alive || !a.length) return;
        const m = new Map(a.map((x) => [x.name_en, `/players/${x.file}`]));
        setList(FOOTBALLERS.map((f) => (m.has(f.name_en) ? { ...f, photo_url: m.get(f.name_en)! } : f)));
      })
      .catch(() => { /* بلا صور: تظهر الصورة الافتراضية */ });
    return () => { alive = false; };
  }, []);
  return list;
}
