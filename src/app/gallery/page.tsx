"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Backdrop from "@/components/Backdrop";
import { FootballerCard, PlayersGrid, POS_AR, POS_DETAIL_AR, posCode } from "@/components/FootballerCard";
import Icon from "@/components/Icon";
import { Logo } from "@/components/ui";
import { ASSETS } from "@/lib/assets";
import { inPacks, PACKS, packsOf, type Pack } from "@/lib/packs";
import { audio, sfx } from "@/lib/sounds";
import { useFootballers } from "@/lib/useFootballers";
import { cx } from "@/lib/utils";

export default function Gallery() {
  const router = useRouter();
  const all = useFootballers();
  const [sel, setSel] = useState<Pack[]>(["stars", "legends", "algeria", "arab"]);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { audio.setMood("menu"); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  const list = useMemo(() => all.filter((f) => inPacks(f, sel)), [all, sel]);
  const f = all.find((x) => x.id === open);
  const toggle = (p: Pack) => setSel((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]));

  return (
    <main className="mx-auto max-w-5xl px-3 pb-12 pt-3">
      <Backdrop src={ASSETS.homeBg} dim={0.6} />
      <div className="mb-4 flex items-center justify-between"><Logo small /><button className="btn-ghost px-4 py-2" onClick={() => router.push("/")}>القائمة</button></div>
      <h1 className="mb-1 text-center text-3xl font-black">معرض اللاعبين</h1>
      <p className="mb-4 text-center text-sm text-white/65">{list.length} لاعبًا — اضغط على أي بطاقة لعرضها كاملة بإطارها</p>
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {PACKS.map((p) => (
          <button key={p.id} onClick={() => toggle(p.id)} aria-pressed={sel.includes(p.id)}
            className={cx("rounded-full border px-4 py-1.5 text-sm font-bold transition", sel.includes(p.id) ? "border-neon bg-neon/15 text-neon" : "border-white/15 bg-white/5 text-white/70")}>{p.title}</button>
        ))}
      </div>
      <PlayersGrid footballers={list} onSelect={(id) => { sfx.select(); setOpen(id); }} />

      {f && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={f.name_ar} onClick={() => setOpen(null)}>
          <div className="glass w-full max-w-sm space-y-3 p-5 text-center animate-pop" onClick={(e) => e.stopPropagation()}>
            <button className="btn-ghost absolute left-3 top-3 px-3 py-1.5" onClick={() => setOpen(null)} aria-label="إغلاق"><Icon name="close" size={18} /></button>
            <div className="mx-auto w-56"><FootballerCard f={f} big reveal={!!f.is_legend} /></div>
            <div className="text-sm text-white/75">
              <div><b>الجنسية:</b> {f.nationality} • <b>المركز:</b> {posCode(f)} — {POS_DETAIL_AR[f.position_detail ?? ""] ?? POS_AR[f.position]}</div>
              <div><b>النادي:</b> {f.club ?? (f.is_legend ? "أسطورة معتزلة" : "—")}{f.league ? ` • ${f.league}` : ""}</div>
              <div className="mt-1 text-xs text-white/50">الحزم: {packsOf(f).map((p) => PACKS.find((x) => x.id === p)!.title).join("، ")}</div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
