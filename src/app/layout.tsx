import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" });

export const metadata: Metadata = {
  title: "ساحة تخمين النجوم — Football Guessing Arena",
  description: "تحدَّ صديقك في تخمين لاعب كرة القدم السرّي. العب أونلاين من جهازين مختلفين.",
};
export const viewport: Viewport = { themeColor: "#070b14", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body>{children}</body>
    </html>
  );
}
