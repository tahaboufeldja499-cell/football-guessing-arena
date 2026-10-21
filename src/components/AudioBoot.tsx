"use client";
import { useEffect } from "react";
import { audio, sfx } from "@/lib/sounds";

/** يفتح الصوت عند أول تفاعل (سياسة المتصفح)، ويضيف نقرة خفيفة للأزرار، ويوقف الصوت عند إخفاء التبويب. */
export default function AudioBoot() {
  useEffect(() => {
    const un = () => audio.unlock();
    const evs = ["pointerdown", "keydown", "touchend"] as const;
    evs.forEach((e) => window.addEventListener(e, un, { capture: true }));
    const click = (e: MouseEvent) => {
      const b = (e.target as Element | null)?.closest?.("button, a");
      if (b && !(b as HTMLButtonElement).disabled && !b.hasAttribute("data-nosound")) sfx.tap();
    };
    const vis = () => audio.visibility(document.visibilityState === "visible");
    document.addEventListener("click", click, true);
    document.addEventListener("visibilitychange", vis);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, un, { capture: true }));
      document.removeEventListener("click", click, true);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);
  return null;
}
