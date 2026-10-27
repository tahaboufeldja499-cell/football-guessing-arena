"use client";
import { useMemo, useState } from "react";
import type { Footballer } from "@/lib/types";
import { cx, hue, initials } from "@/lib/utils";

export const POS_AR: Record<Footballer["position"], string> = { GK: "حارس", DF: "مدافع", MF: "وسط", FW: "مهاجم" };

export function Avatar({ f, size = 64 }: { f: Footballer; size?: number }) {
  const [bad, setBad] = useState(false);
  const h = hue(f.name_en);
  if (f.photo_url && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={f.photo_url} alt={f.name_ar} width={size} height={size} loading="lazy" onError={() => setBad(true)}
      className="rounded-full object-cover ring-2 ring-white/20" style={{ width: size, height: size }} />;
  }
  return (
    <div aria-hidden className="grid place-items-center rounded-full font-black text-white ring-2 ring-white/20"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${h} 70% 38%), hsl(${(h + 50) % 360} 70% 22%))` }}>
      {initials(f.name_en)}
    </div>
  );
}

interface CardProps {
  f: Footballer; selected?: boolean; excluded?: boolean; disabled?: boolean; mark?: string;
  onClick?: () => void; big?: boolean;
}
export function FootballerCard({ f, selected, excluded, disabled, mark, onClick, big }: CardProps) {
  const body = (
    <>
      <Avatar f={f} size={big ? 96 : 52} />
      <div className={cx("w-full truncate font-bold leading-tight", big ? "text-xl" : "text-[13px]")}>{f.name_ar}</div>
      <div className="w-full truncate text-[11px] text-white/55">{f.club ?? "—"}</div>
      <span className="rounded-full bg-white/10 px-2 text-[10px] text-white/70">{POS_AR[f.position]}</span>
      {mark && <span className="absolute left-1.5 top-1.5 rounded-full bg-red-500/90 px-1.5 text-[11px] font-black">{mark}</span>}
    </>
  );
  const cls = cx("relative flex flex-col items-center gap-1 rounded-2xl border p-2 text-center transition",
    selected ? "border-neon bg-neon/15 shadow-[0_0_22px_rgba(45,255,122,.35)]" : "border-white/10 bg-white/[0.05]",
    excluded && "opacity-25 grayscale", disabled && "opacity-30", onClick && !disabled && "hover:border-white/30 active:scale-95");
  if (!onClick) return <div className={cls}>{body}</div>;
  return <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-pressed={selected}>{body}</button>;
}

interface GridProps {
  footballers: Footballer[]; selectedId?: number | null; excluded?: Set<number>;
  disabledIds?: Set<number>; onSelect: (id: number) => void;
}
export function PlayersGrid({ footballers, selectedId, excluded, disabledIds, onSelect }: GridProps) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return footballers;
    return footballers.filter((f) => [f.name_ar, f.name_en, f.club ?? "", f.nationality, f.league ?? ""].join(" ").toLowerCase().includes(t));
  }, [footballers, q]);
  return (
    <div>
      <input className="input mb-3" placeholder="ابحث باسم اللاعب أو النادي أو الجنسية…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث عن لاعب" />
      {list.length === 0 ? (
        <div className="glass p-8 text-center text-white/60">لا يوجد لاعب بهذا البحث.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {list.map((f) => (
            <FootballerCard key={f.id} f={f} selected={selectedId === f.id} excluded={excluded?.has(f.id)}
              disabled={disabledIds?.has(f.id)} mark={disabledIds?.has(f.id) ? "✕" : undefined} onClick={() => onSelect(f.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
