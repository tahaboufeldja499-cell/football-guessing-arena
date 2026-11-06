"use client";
import { useMemo, useState } from "react";
import { ASSETS } from "@/lib/assets";
import { countryCode, flagCode } from "@/lib/countries";
import type { Footballer } from "@/lib/types";
import { cx } from "@/lib/utils";

export const POS_AR: Record<Footballer["position"], string> = { GK: "حارس", DF: "مدافع", MF: "وسط", FW: "مهاجم" };
/** المراكز التفصيلية (أسلوب eFootball). */
export const POS_DETAIL_AR: Record<string, string> = {
  GK: "حارس مرمى", CB: "قلب دفاع", LB: "ظهير أيسر", RB: "ظهير أيمن", DMF: "وسط مدافع", CMF: "وسط ملعب",
  LMF: "وسط أيسر", RMF: "وسط أيمن", AMF: "وسط مهاجم", LWF: "جناح أيسر", RWF: "جناح أيمن", SS: "مهاجم ثانٍ", CF: "رأس حربة",
};
/** الكود الظاهر على البطاقة: التفصيلي إن وُجد وإلا العام. */
export const posCode = (f: Footballer) => f.position_detail ?? f.position;

/** يصغّر الاسم الطويل ليبقى داخل لوحة الاسم دون قص. */
const nameSize = (n: string) => (n.length <= 12 ? 6.3 : n.length <= 16 ? 5.2 : 4.4);

interface CardProps {
  f: Footballer; selected?: boolean; excluded?: boolean; disabled?: boolean; mark?: string;
  onClick?: () => void; big?: boolean; reveal?: boolean;
}

/** البطاقة: big = كاملة بنصوص على اللوحات، وإلا «بلاطة» للشبكات (الاسم تحتها كنص واضح). */
export function FootballerCard({ f, selected, excluded, disabled, mark, onClick, big, reveal }: CardProps) {
  const [bad, setBad] = useState(false);
  const legend = !!f.is_legend;
  const hasPhoto = !!f.photo_url && !bad;

  const card = (
    <div className={cx("fcard-wrap", selected && "sel", excluded && "ex", reveal && "reveal")}>
      {selected && /* eslint-disable-next-line @next/next/no-img-element */ <img className="fcard-halo" src={ASSETS.glow} alt="" aria-hidden />}
      <div className={cx("fcard", legend && "legend", !big && "tile")}>
        <div className="back" aria-hidden />
        <div className="win">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={cx("photo", !hasPhoto && "fallback")} src={hasPhoto ? f.photo_url! : ASSETS.avatar} alt={hasPhoto ? f.name_ar : ""}
            loading="lazy" decoding="async" onError={() => setBad(true)} />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="frame" src={legend ? ASSETS.legendFrame : ASSETS.frame} alt="" aria-hidden decoding="async" />
        {legend && <span className="t b">أسطورة</span>}
        <span className="t n" style={{ fontSize: `${nameSize(f.name_ar)}cqw` }}>{f.name_ar}</span>
        <span className="t p">{posCode(f)}</span>
        <span className="t f" dir="ltr" title={f.nationality}>
          {flagCode(f.nationality) ? <span className={`fi fi-${flagCode(f.nationality)}`} role="img" aria-label={f.nationality} /> : countryCode(f.nationality)}
        </span>
      </div>
      {(excluded || mark) && (
        <svg className="xmark" viewBox="0 0 100 100" aria-hidden>
          <path d="M16 20L84 80M84 20L16 80" stroke="#ef4444" strokeWidth="7" strokeLinecap="round" opacity=".92" />
        </svg>
      )}
    </div>
  );

  if (big) return <div>{card}</div>;
  const label = (
    <>
      <div className="tile-name">{f.name_ar}</div>
      <div className="tile-sub">{posCode(f)} • {f.club ?? f.nationality}</div>
    </>
  );
  if (!onClick) return <div>{card}{label}</div>;
  return (
    <button type="button" className="fcard-btn" onClick={onClick} disabled={disabled} aria-pressed={selected}
      aria-label={`${f.name_ar}${excluded ? " (مستبعد)" : ""}`}>
      {card}{label}
    </button>
  );
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
        <div className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {list.map((f) => (
            <FootballerCard key={f.id} f={f} selected={selectedId === f.id} excluded={excluded?.has(f.id)}
              disabled={disabledIds?.has(f.id)} mark={disabledIds?.has(f.id) ? "x" : undefined} onClick={() => onSelect(f.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
