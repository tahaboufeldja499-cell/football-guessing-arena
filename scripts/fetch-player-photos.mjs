// يجلب صور اللاعبين من ويكيميديا كومنز (رخص مفتوحة فقط) ويسجّل الحقوق.
// التشغيل (يعمل في PowerShell وcmd):   npm run photos -- --email you@example.com
// اختبار لاعب واحد:                     npm run photos -- --email you@example.com --only "Lionel Messi"
// خيارات: --dry (عرض الأسماء)  --limit 10  --adopt (يضيف صورًا وضعتها يدويًا في public/players)
// آمن عند التكرار: يكمل من حيث توقف ولا يعيد تنزيل الصور الموجودة.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = process.env.PHOTOS_OUT_DIR || path.join(ROOT, "public", "players");
const SQL_FILE = process.env.PHOTOS_SQL || path.join(ROOT, "supabase", "003_photos.sql");
let UA = "FootballGuessingArena/1.0 (unset-contact) fetch-player-photos";

// أسماء مقالات ويكيبيديا التي لا تطابق الاسم الإنجليزي مباشرة (أضف هنا ما يفشل)
export const TITLE_OVERRIDES = { Rodri: "Rodri (footballer, born 1996)", "Raúl": "Raúl (footballer, born 1977)" };

export const slugify = (n) => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** أسماء اللاعبين من ملفات SQL: ('الاسم','English Name','الجنسية', ... */
export async function parseNames(files) {
  const seen = new Map();
  for (const f of files) {
    let txt = ""; try { txt = await fs.readFile(f, "utf8"); } catch { continue; }
    const S = "((?:[^']|'')*)"; // نص SQL بين فاصلتين عُليَين، ويدعم '' للهروب
    for (const m of txt.matchAll(new RegExp(`\\(\\s*'${S}'\\s*,\\s*'${S}'\\s*,\\s*'${S}'`, "g"))) {
      const ar = m[1].replace(/''/g, "'"), en = m[2].replace(/''/g, "'");
      if (!seen.has(en)) seen.set(en, { name_ar: ar, name_en: en });
    }
  }
  return [...seen.values()];
}

/** رخص مسموحة: CC0 / CC BY / CC BY-SA / ملكية عامة. نرفض NC وND. */
export function licenseOk(l) {
  return /^(CC0|CC[- ]BY|Public domain|PD)/i.test(l || "") && !/(^|[ -])(NC|ND)([ -]|$)/i.test(l);
}
const stripHtml = (s) => (s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function getJson(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (r.ok) return r.json();
    if (![429, 500, 502, 503, 504].includes(r.status) || i === tries) throw new Error(`HTTP ${r.status} ${r.statusText || ""} من ${new URL(url).host}${r.status === 403 ? " (تأكد من تمرير --email ببريدك الحقيقي)" : ""}`);
    await new Promise((res) => setTimeout(res, 1500 * i));
  }
}

export async function lookup(nameEn) {
  const title = TITLE_OVERRIDES[nameEn] || nameEn;
  const w = await getJson(`https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages|description&piprop=name&titles=${encodeURIComponent(title)}`);
  const page = Object.values(w.query?.pages || {})[0];
  if (!page || page.missing !== undefined) return { error: "مقالة ويكيبيديا غير موجودة (أضف اسمها في TITLE_OVERRIDES)" };
  if (!/football|soccer/i.test(page.description || "")) return { error: `المقالة ليست للاعب كرة قدم على الأرجح: «${page.description || "بلا وصف"}»` };
  if (!page.pageimage) return { error: "لا توجد صورة رئيسية للمقالة" };
  const c = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640&titles=${encodeURIComponent("File:" + page.pageimage)}`);
  const ii = Object.values(c.query?.pages || {})[0]?.imageinfo?.[0];
  if (!ii) return { error: "الصورة ليست على كومنز (غالبًا غير حرّة)" };
  const md = ii.extmetadata || {};
  const license = stripHtml(md.LicenseShortName?.value);
  if (!licenseOk(license)) return { error: `رخصة غير مسموحة: «${license || "غير معروفة"}»` };
  return {
    url: ii.thumburl || ii.url, license, licenseUrl: md.LicenseUrl?.value || "",
    author: stripHtml(md.Artist?.value) || "غير مذكور", source: ii.descriptionurl,
  };
}

async function download(url, base) {
  for (let i = 1; i <= 3; i++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.ok) {
      const ext = (path.extname(new URL(url).pathname) || ".jpg").toLowerCase();
      const file = base + ext;
      await fs.writeFile(path.join(OUT_DIR, file), Buffer.from(await r.arrayBuffer()));
      return file;
    }
    if (![429, 500, 502, 503, 504].includes(r.status) || i === 3) throw new Error(`HTTP ${r.status}`);
    await new Promise((res) => setTimeout(res, 2000 * i));
  }
}

export async function main(argv = process.argv.slice(2), delay = 400) {
  if (typeof fetch !== "function") { console.error("نسخة Node قديمة. ثبّت Node 18 أو أحدث من nodejs.org ثم أعد المحاولة."); process.exit(1); }
  const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const email = flag("--email") || process.env.CONTACT_EMAIL;
  if (email) UA = `FootballGuessingArena/1.0 (${email}) fetch-player-photos`;
  let players = await parseNames([path.join(ROOT, "supabase", "seed.sql"), path.join(ROOT, "supabase", "002_legends.sql")]);
  if (flag("--only")) players = players.filter((p) => p.name_en === flag("--only"));
  if (flag("--limit")) players = players.slice(0, Number(flag("--limit")));
  console.log(`${players.length} لاعبًا`);
  if (argv.includes("--dry")) { players.forEach((p) => console.log(" -", p.name_en)); return; }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const attrFile = path.join(OUT_DIR, "ATTRIBUTION.json");
  let attrs = []; try { attrs = JSON.parse(await fs.readFile(attrFile, "utf8")); } catch { /* أول تشغيل */ }
  const byName = new Map(attrs.map((a) => [a.name_en, a]));
  const q = (x) => x.replace(/'/g, "''");
  const save = async () => {
    const all = [...byName.values()];
    await fs.writeFile(attrFile, JSON.stringify(all, null, 2));
    await fs.writeFile(SQL_FILE, "-- يُولَّد تلقائيًا بواسطة scripts/fetch-player-photos.mjs — شغّله في SQL Editor\n" +
      all.map((a) => `update public.footballers set photo_url = '/players/${q(a.file)}' where name_en = '${q(a.name_en)}';`).join("\n") + "\n");
    return all.length;
  };

  // وضع يدوي: ضع صورة اللاعب في public/players باسم الـ slug (مثل lionel-messi.jpg) ثم شغّل --adopt
  if (argv.includes("--adopt")) {
    const files = await fs.readdir(OUT_DIR);
    let added = 0;
    for (const p of players) {
      const base = slugify(p.name_en) + ".";
      const f = files.find((x) => x.toLowerCase().startsWith(base) && !x.toLowerCase().endsWith(".json"));
      if (f && !byName.has(p.name_en)) {
        byName.set(p.name_en, { name_en: p.name_en, name_ar: p.name_ar, file: f, license: "مضافة يدويًا — تحقق من رخصتها", licenseUrl: "", author: "غير مذكور", source: "" });
        added++; console.log("✓ تبنّيت:", f);
      }
    }
    console.log(`\nأُضيفت ${added} • الإجمالي ${await save()}. شغّل supabase/003_photos.sql للأونلاين.`);
    return;
  }

  // فحص الاتصال أولًا برسالة واضحة
  try { await getJson("https://en.wikipedia.org/w/api.php?action=query&meta=siteinfo&format=json"); }
  catch (e) { console.error("✗ تعذّر الاتصال بويكيبيديا:", e.message, "\n  تحقق من الإنترنت أو جدار الحماية/VPN ثم أعد المحاولة."); process.exit(1); }

  const failed = [];
  for (const p of players) {
    if (byName.has(p.name_en)) { console.log("✓ موجود:", p.name_en); continue; }
    try {
      const info = await lookup(p.name_en);
      if (info.error) throw new Error(info.error);
      const file = await download(info.url, slugify(p.name_en));
      byName.set(p.name_en, { name_en: p.name_en, name_ar: p.name_ar, file, license: info.license, licenseUrl: info.licenseUrl, author: info.author, source: info.source });
      console.log("✓", p.name_en, "—", info.license);
    } catch (e) { failed.push([p.name_en, e.message]); console.log("✗", p.name_en, "—", e.message); }
    await new Promise((r) => setTimeout(r, delay));
  }

  const total = await save();
  console.log(`\nنجح ${total} • فشل ${failed.length}   (الصور في ${OUT_DIR})`);
  failed.forEach(([n, why]) => console.log("  ✗", n, "→", why));
  if (total === 0) console.log("\nلم تُنزَّل أي صورة. ابعث لي أول سطرين من الأخطاء أعلاه.");
  else console.log("الخطوات التالية: 1) حدّث الصفحة (المحلي والمعرض يقرآن الصور تلقائيًا)  2) للأونلاين شغّل supabase/003_photos.sql في SQL Editor.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
