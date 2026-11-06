"use client";
import { useEffect } from "react";

/** داخل تطبيق أندرويد فقط: ألوان شريط الحالة، وزر الرجوع (يخرج من التطبيق من الصفحة الرئيسية). */
export default function NativeBoot() {
  useEffect(() => {
    let off: (() => void) | undefined;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        document.documentElement.classList.add("native");
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#050908" });
        await StatusBar.setOverlaysWebView({ overlay: false });
        const { App } = await import("@capacitor/app");
        const h = await App.addListener("backButton", () => {
          const atHome = window.location.pathname.replace(/\/$/, "") === "";
          if (atHome) App.exitApp(); else window.history.back();
        });
        off = () => { h.remove(); };
      } catch { /* على الويب لا توجد إضافات أصلية */ }
    })();
    return () => off?.();
  }, []);
  return null;
}
