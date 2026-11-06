"use client";
import { useMemo } from "react";
import { cx } from "@/lib/utils";
import { ASSETS } from "@/lib/assets";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ASSETS.emblem} alt="" width={64} height={64} className={cx("object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,.6)]", small ? "h-11 w-11" : "h-[72px] w-[72px]")} />
      <div className="leading-tight">
        <div className={cx("font-display font-bold uppercase tracking-[.14em] text-silver", small ? "text-sm" : "text-lg")} dir="ltr">Football <span className="text-gold">Guessing</span> Arena</div>
        <div className={cx("font-bold text-neon", small ? "text-[11px]" : "text-sm")}>ساحة تخمين النجوم</div>
      </div>
    </div>
  );
}

/** الصورة الافتراضية لحساب اللاعب (لا توجد صور حسابات بعد). */
export function PlayerAvatar({ size = 56, className }: { size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={ASSETS.avatar} alt="" width={size} height={size} className={cx("object-contain", className)} style={{ width: size, height: size }} />;
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
    <div role="status" className={cx("fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-[60] mx-auto max-w-md rounded-xl border px-4 py-3 text-center text-sm font-bold shadow-2xl animate-rise",
      kind === "err" ? "border-red-400/50 bg-red-950/90 text-red-100" : "border-neon/40 bg-ink/95 text-neon")}>{text}</div>
  );
}

export function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    left: (i * 37) % 100, delay: (i % 9) * 0.18, color: ["#3fdc86", "#f5c451", "#ffffff", "#5aa0ff"][i % 4], size: 6 + (i % 4) * 2,
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
  return <span className={cx("inline-block h-2.5 w-2.5 rounded-full", online ? "bg-neon shadow-[0_0_8px_#3fdc86]" : "bg-red-400")} />;
}
