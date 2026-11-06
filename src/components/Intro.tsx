"use client";
import { useEffect, useRef, useState } from "react";
import { ASSETS } from "@/lib/assets";
import { audio } from "@/lib/sounds";
import Icon from "./Icon";

/** مقدمة سينمائية داخل نفق الملعب. تبدأ بضغطة «ابدأ» (المتصفح يمنع الصوت قبل أول تفاعل)،
 *  ثم تنطلق الصورة والصوت معًا: وميض الأضواء ← ضربة كبرى مع العنوان ← «ادخل الملعب». قابلة للتخطي دائمًا. */
export default function Intro({ onDone }: { onDone: () => void }) {
  const [go, setGo] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const started = useRef(false);
  const done = useRef(false);

  const start = () => {
    if (started.current || done.current) return;
    started.current = true;
    audio.unlock(); audio.playIntroCue(); setGo(true);
  };
  const finish = (skip: boolean) => {
    if (done.current) return;
    done.current = true;
    try { sessionStorage.setItem("fga-intro", "1"); } catch { /* ignore */ }
    audio.unlock();
    if (skip || !started.current) audio.stopIntroCue();
    setLeaving(true);
    setTimeout(onDone, 650);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(true);
      else if (e.key === "Enter") { if (!started.current) start(); else finish(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`intro ${go ? "go" : ""} ${leaving ? "leaving" : ""}`} role="dialog" aria-label="مقدمة اللعبة">
      <div className="intro-bg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ASSETS.introBg} alt="" decoding="async" />
      </div>
      <div className="intro-shade" />
      <div className="intro-vignette" />
      <button onClick={() => finish(true)} data-nosound className="absolute left-4 top-4 z-[4] rounded-full border border-white/25 bg-black/50 px-4 py-1.5 text-sm text-white/85 hover:bg-white/10">تخطي</button>

      <div className="gate">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.emblem} alt="" width={120} height={120} className="mx-auto mb-5 h-28 w-28 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,.8)]" />
          <button onClick={start} className="btn-gold px-12 py-4 text-xl" data-nosound>اضغط للبدء</button>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-white/65"><Icon name="volume" size={16} />المقدمة تعمل بالصوت</p>
        </div>
      </div>

      <div className="content max-w-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ASSETS.emblem} alt="" width={140} height={140} className="i1 mx-auto mb-4 h-32 w-32 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,.7)] sm:h-40 sm:w-40" />
        <h1 className="i2 font-display text-4xl font-bold uppercase text-silver [text-shadow:0_4px_24px_rgba(0,0,0,.9)] sm:text-6xl" dir="ltr">
          Football <span className="text-gold">Guessing</span> Arena
        </h1>
        <div className="i2 mt-2 text-2xl font-black text-neon [text-shadow:0_2px_12px_rgba(0,0,0,.9)]">ساحة تخمين النجوم</div>
        <p className="i3 mx-auto mt-5 max-w-md text-lg text-white/85 [text-shadow:0_2px_10px_rgba(0,0,0,.9)]">الأضواء اشتعلت والجمهور ينتظر. هل تستطيع كشف هوية النجم قبل خصمك؟</p>
        <button onClick={() => finish(false)} className="i4 btn-gold mt-8 px-10 py-4 text-xl">ادخل الملعب</button>
      </div>
    </div>
  );
}
