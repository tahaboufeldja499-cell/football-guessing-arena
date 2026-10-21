import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050908",      // أسود فحمي
        navy: "#06231a",     // أخضر زمردي عميق (للخلفيات الداكنة)
        emerald: { deep: "#0b3d2e", DEFAULT: "#13805a" },
        neon: "#3fdc86",     // أخضر فاتح: الحالات النشطة والتحديد فقط
        gold: "#d4af37",     // ذهبي معدني: الكؤوس والانتصارات
        silver: "#e6ecea",
      },
      fontFamily: { display: ["var(--font-display)", "var(--font-cairo)", "sans-serif"] },
      keyframes: {
        pop: { "0%": { transform: "scale(.94)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        rise: { "0%": { transform: "translateY(14px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        glow: { "0%,100%": { boxShadow: "0 0 0 rgba(63,220,134,0)" }, "50%": { boxShadow: "0 0 22px rgba(63,220,134,.35)" } },
        fall: { "0%": { transform: "translateY(-10vh) rotate(0deg)", opacity: "1" }, "100%": { transform: "translateY(105vh) rotate(540deg)", opacity: "0" } },
      },
      animation: {
        pop: "pop .25s ease-out both",
        rise: "rise .35s ease-out both",
        glow: "glow 1.8s ease-in-out infinite",
        fall: "fall 3.2s linear forwards",
      },
    },
  },
  plugins: [],
};
export default config;
