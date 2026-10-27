"use client";
import { useMemo } from "react";
import { cx } from "@/lib/utils";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className={cx("grid place-items-center rounded-full border-2 border-neon bg-black/40 shadow-[0_0_22px_rgba(45,255,122,.45)]", small ? "h-9 w-9 text-lg" : "h-14 w-14 text-3xl")}>⚽</div>
      <div className="leading-tight">
        <div className={cx("font-black tracking-wider text-white", small ? "text-sm" : "text-lg")} dir="ltr">FOOTBALL <span className="text-neon">GUESSING</span> ARENA</div>
        <div className={cx("font-bold text-gold", small ? "text-[11px]" : "text-sm")}>ساحة تخمين النجوم</div>
      </div>
    </div>
  );
}

export function Spinner({ label = "جارٍ التحميل..." }: { label?: string }) {
  return (
    <div className="grid place-items-center gap-3 py-16 text-white/70" role="status">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-neon" />
      <span>{label}</span>
    </div>
  );
}

export function ConnBanner({ conn }: { conn: "connected" | "reconnecting" }) {
  if (conn === "connected") return null;
  return (
    <div role="alert" className="mb-3 flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm text-gold animate-pop">
      <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
      انقطع الاتصال… نحاول إعادة الاتصال. حالة المباراة محفوظة على الخادم ولن تضيع.
    </div>
  );
}

export function Toast({ text, kind }: { text: string; kind: "ok" | "err" }) {
  return (
    <div role="status" className={cx("fixed inset-x-3 bottom-4 z-[60] mx-auto max-w-md rounded-xl border px-4 py-3 text-center text-sm font-bold shadow-2xl animate-rise",
      kind === "err" ? "border-red-400/50 bg-red-950/90 text-red-100" : "border-neon/40 bg-ink/95 text-neon")}>{text}</div>
  );
}

export function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    left: (i * 37) % 100, delay: (i % 9) * 0.18, color: ["#2dff7a", "#f5c451", "#ffffff", "#5aa0ff"][i % 4], size: 6 + (i % 4) * 2,
  })), []);
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span key={i} className="absolute top-0 animate-fall rounded-sm"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.6, background: p.color, animationDelay: `${p.delay}s` }} />
      ))}
    </div>
  );
}

export function StatusDot({ online }: { online: boolean }) {
  return <span className={cx("inline-block h-2.5 w-2.5 rounded-full", online ? "bg-neon shadow-[0_0_8px_#2dff7a]" : "bg-red-400")} />;
}
