"use client";
import { useEffect } from "react";

// قيم ثابتة (لا عشوائية) لتجنّب اختلاف الـ hydration
const BEAMS = [
  { x: "8%", r: "-15deg", d: "-2s" }, { x: "34%", r: "-5deg", d: "-7s" },
  { x: "66%", r: "5deg", d: "-4s" }, { x: "92%", r: "15deg", d: "-9s" },
];
const MOTES = Array.from({ length: 16 }, (_, i) => ({
  l: `${(i * 53 + 7) % 100}%`, s: `${2 + (i % 3)}px`, t: `${14 + (i % 5) * 4}s`, dl: `${-(i * 1.7) % 18}s`,
}));

export default function Stadium() {
  useEffect(() => {
    // أجهزة محدودة الأداء → نسخة أخف (بلا جزيئات ولا ضباب)
    const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
    document.documentElement.classList.toggle("lite", weak);
  }, []);
  return (
    <div className="stadium" aria-hidden>
      {BEAMS.map((b, i) => <div key={i} className="beam" style={{ "--x": b.x, "--r": b.r, "--d": b.d } as React.CSSProperties} />)}
      {BEAMS.map((b, i) => <div key={`l${i}`} className="lamp" style={{ "--x": b.x } as React.CSSProperties} />)}
      <div className="crowd c1" />
      <div className="crowd c2" />
      <div className="haze" /><div className="haze h2" />
      <div className="horizon" />
      <div className="pitch-wrap">
        <div className="pitch">
          <svg viewBox="0 0 1000 600" preserveAspectRatio="none" fill="none" stroke="#fff" strokeWidth="3">
            <rect x="40" y="30" width="920" height="540" />
            <path d="M500 30V570" />
            <circle cx="500" cy="300" r="75" />
            <rect x="40" y="170" width="140" height="260" /><rect x="820" y="170" width="140" height="260" />
            <rect x="40" y="235" width="55" height="130" /><rect x="905" y="235" width="55" height="130" />
          </svg>
        </div>
      </div>
      {MOTES.map((m, i) => <span key={i} className="mote" style={{ "--l": m.l, "--s": m.s, "--t": m.t, "--dl": m.dl } as React.CSSProperties} />)}
      <div className="st-vignette" />
    </div>
  );
}
