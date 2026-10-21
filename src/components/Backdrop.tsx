"use client";
import { useEffect, useState, type CSSProperties } from "react";

/** خلفية مصوّرة ثابتة خلف المحتوى. dim = قوة التعتيم لضمان قراءة النصوص. */
export default function Backdrop({ src, dim = 0.5 }: { src: string; dim?: number }) {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    if (ok) root.classList.add("has-backdrop"); else root.classList.remove("has-backdrop");
    return () => root.classList.remove("has-backdrop");
  }, [ok]);
  if (!ok) return null; // الملعب المرسوم بالكود يعمل كبديل
  return (
    <div className="backdrop" style={{ "--dim": dim } as CSSProperties} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" decoding="async" onError={() => setOk(false)} />
    </div>
  );
}
