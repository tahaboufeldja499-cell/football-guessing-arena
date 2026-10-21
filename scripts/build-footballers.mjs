// يولّد src/data/footballers.ts من ملفات SQL (للّعب المحلي والمعرض بدون قاعدة بيانات).
// التشغيل بعد أي تعديل على seed.sql أو 002_legends.sql:  npm run gen:data
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BROAD, POSITIONS } from "./positions.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const S = "((?:[^']|'')*)";
const un = (s) => s.replace(/''/g, "'");
const row = (n) => new RegExp(`\\(\\s*${Array(n).fill(`'${S}'`).join("\\s*,\\s*")}\\s*\\)`, "g");

const seed = await fs.readFile(path.join(ROOT, "supabase", "seed.sql"), "utf8");
const leg = await fs.readFile(path.join(ROOT, "supabase", "002_legends.sql"), "utf8");
const players = [];
const seen = new Set();
const push = (p) => { if (!seen.has(p.name_en)) { seen.add(p.name_en); players.push({ id: players.length + 1, ...p }); } };

for (const m of seed.matchAll(row(6))) push({ name_ar: un(m[1]), name_en: un(m[2]), nationality: un(m[3]), club: un(m[4]), league: un(m[5]), position: m[6], is_legend: false });
for (const m of leg.matchAll(row(4))) push({ name_ar: un(m[1]), name_en: un(m[2]), nationality: un(m[3]), club: null, league: null, position: m[4], is_legend: true });
for (const p of players) if (p.name_en === "Eden Hazard") { p.is_legend = true; p.club = null; p.league = null; }

// المركز التفصيلي (CF, SS, RWF...) من positions.mjs، ويُشتق منه المركز العام ليتطابقا دائمًا
const missing = players.filter((p) => !POSITIONS[p.name_en]);
if (missing.length) throw new Error("لا مركز تفصيلي للاعبين: " + missing.map((m) => m.name_en).join(", "));
const unknown = Object.keys(POSITIONS).filter((n) => !seen.has(n));
if (unknown.length) throw new Error("أسماء في positions.mjs غير موجودة في SQL: " + unknown.join(", "));
for (const p of players) {
  const d = POSITIONS[p.name_en];
  if (!BROAD[d]) throw new Error(`رمز مركز غير صالح ${d} للاعب ${p.name_en}`);
  p.position_detail = d; p.position = BROAD[d];
}

const body = players.map((p) => "  " + JSON.stringify({ ...p, photo_url: null })).join(",\n");
await fs.writeFile(path.join(ROOT, "src", "data", "footballers.ts"),
`// ملف مولَّد تلقائيًا بواسطة scripts/build-footballers.mjs — لا تعدّله يدويًا.
import type { Footballer } from "@/lib/types";

export const FOOTBALLERS: Footballer[] = [
${body},
];
`);
const q = (x) => x.replace(/'/g, "''");
await fs.writeFile(path.join(ROOT, "supabase", "004_positions.sql"),
`-- يُولَّد تلقائيًا بواسطة scripts/build-footballers.mjs من scripts/positions.mjs — شغّله في SQL Editor (آمن عند التكرار).
alter table public.footballers add column if not exists position_detail text;
` + players.map((p) => `update public.footballers set position = '${p.position}', position_detail = '${p.position_detail}' where name_en = '${q(p.name_en)}';`).join("\n") + "\n");
console.log(`تم: ${players.length} لاعبًا (${players.filter((p) => p.is_legend).length} أسطورة)`);
