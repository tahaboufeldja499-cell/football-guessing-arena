"use client";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";

interface Credit { name_en: string; name_ar: string; file: string; license: string; licenseUrl: string; author: string; source: string }

export default function Credits() {
  const [list, setList] = useState<Credit[] | null>(null);
  useEffect(() => {
    fetch("/players/ATTRIBUTION.json").then((r) => (r.ok ? r.json() : [])).then(setList).catch(() => setList([]));
  }, []);
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex justify-center"><Logo /></div>
      <h1 className="mb-4 text-center text-2xl font-black">الحقوق ومصادر الصور</h1>
      <section className="glass mb-4 space-y-2 p-4 text-sm text-white/80">
        <p>صور اللاعبين مأخوذة من ويكيميديا كومنز برخص مفتوحة (CC0 وCC BY وCC BY-SA وملكية عامة)، ولكل صورة مصوّرها ورخصتها أدناه.</p>
        <p>الأعلام من حزمة <a className="underline" href="https://github.com/lipis/flag-icons" target="_blank" rel="noreferrer">flag-icons</a> (رخصة MIT).</p>
      </section>
      {list === null ? <p className="text-center text-white/60">جارٍ التحميل…</p>
        : list.length === 0 ? <p className="glass p-6 text-center text-white/60">لا توجد صور لاعبين مستعملة بعد.</p>
        : (
          <div className="space-y-2">
            {list.map((c) => (
              <div key={c.name_en} className="glass flex items-center gap-3 p-3 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/players/${c.file}`} alt="" width={48} height={48} loading="lazy" className="h-12 w-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{c.name_ar} <span className="text-white/50" dir="ltr">({c.name_en})</span></div>
                  <div className="truncate text-white/65">المصوّر: {c.author} • {c.licenseUrl || c.source ? <a className="underline" href={c.licenseUrl || c.source} target="_blank" rel="noreferrer">{c.license}</a> : c.license}{c.source && <> • <a className="underline" href={c.source} target="_blank" rel="noreferrer">المصدر</a></>}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      <p className="mt-6 text-center"><a href="/" className="underline">العودة للرئيسية</a></p>
    </main>
  );
}
