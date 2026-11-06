"use client";
import { useEffect, useState } from "react";
import { audio, getMusicVol, getSfxVol, isMusicOn, isSfxOn, sfx } from "@/lib/sounds";
import Icon from "./Icon";

function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} data-nosound
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-neon" : "bg-white/20"}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "right-1" : "right-6"}`} />
    </button>
  );
}
function Block({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3"><div><div className="font-bold">{title}</div><div className="text-xs text-white/55">{hint}</div></div>{children}</div>;
}

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [music, setMusic] = useState(true);
  const [fx, setFx] = useState(true);
  const [mv, setMv] = useState(60);
  const [sv, setSv] = useState(80);
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    setMusic(isMusicOn()); setFx(isSfxOn()); setMv(Math.round(getMusicVol() * 100)); setSv(Math.round(getSfxVol() * 100));
    try { setIntro(localStorage.getItem("fga-intro-off") !== "1"); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="الإعدادات" onClick={onClose}>
      <div className="glass max-h-[92vh] w-full max-w-sm space-y-3 overflow-y-auto p-5 animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-black"><Icon name="sliders" size={22} className="text-gold" />الإعدادات</h2>
          <button className="btn-ghost px-3 py-1.5" onClick={onClose} aria-label="إغلاق"><Icon name="close" size={18} /></button>
        </div>
        <Block title="الموسيقى" hint="موسيقى الدخول والقائمة والمباراة والفوز">
          <div className="flex items-center gap-3">
            <Toggle on={music} label="الموسيقى" onChange={(v) => { setMusic(v); audio.setMusicOn(v); }} />
            <input type="range" min={0} max={100} value={mv} disabled={!music} aria-label="مستوى الموسيقى" className="w-full accent-[#3fdc86] disabled:opacity-40"
              onChange={(e) => { const v = Number(e.target.value); setMv(v); audio.setMusicVol(v / 100); }} />
          </div>
        </Block>
        <Block title="المؤثرات الصوتية" hint="الأسئلة والإجابات والتخمين وكشف اللاعب والفوز">
          <div className="flex items-center gap-3">
            <Toggle on={fx} label="المؤثرات" onChange={(v) => { setFx(v); audio.setSfxOn(v); if (v) sfx.yes(); }} />
            <input type="range" min={0} max={100} value={sv} disabled={!fx} aria-label="مستوى المؤثرات" className="w-full accent-[#3fdc86] disabled:opacity-40"
              onChange={(e) => { const v = Number(e.target.value); setSv(v); audio.setSfxVol(v / 100); }} onPointerUp={() => sfx.select()} />
          </div>
        </Block>
        <Block title="عرض المقدمة" hint="المقدمة السينمائية عند فتح اللعبة">
          <Toggle on={intro} label="عرض المقدمة" onChange={(v) => { setIntro(v); try { localStorage.setItem("fga-intro-off", v ? "0" : "1"); } catch { /* ignore */ } }} />
        </Block>
        <p className="text-xs text-white/45">الموسيقى والمؤثرات مولَّدة بالكود. لاستعمال موسيقى حقيقية مرخّصة ضع ملفات mp3 في public/audio (التفاصيل في README).</p>
      </div>
    </div>
  );
}
