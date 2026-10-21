import type { Metadata, Viewport } from "next";
import { Cairo, Oswald } from "next/font/google";
import AudioBoot from "@/components/AudioBoot";
import NativeBoot from "@/components/NativeBoot";
import Stadium from "@/components/Stadium";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";
import "./cards.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "ساحة تخمين النجوم — Football Guessing Arena",
  description: "تحدَّ صديقك في تخمين لاعب كرة القدم السرّي. العب أونلاين من جهازين مختلفين.",
};
export const viewport: Viewport = { themeColor: "#050908", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${oswald.variable}`}>
      <body>
        <AudioBoot />
        <NativeBoot />
        <Stadium />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
