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
export const TITLE_OVERRIDES = { Rodri: "Rodri (footballer, born 1996)", "Raúl": "Raúl (footballer, born 1977)", Ederson: "Ederson (footballer, born 1993)", Vitinha: "Vitinha (footballer, born 2000)" };

export const slugify = (n) => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** أسماء اللاعبين من ملفات SQL: ('الاسم','English Name','الجنسية', ... */
export async function parseNames(files) {
  const seen = new Map();
  for (const f of files) {
    let txt = ""; try { txt = await fs.readFile(f, "utf8"); } catch { continue; }
    const S = "((?:[^']|'')*)"; // نص SQL بين فاصلتين عُليَين، ويدعم '' للهروب
    for (const m of txt.matchAll(new RegExp(`\\(\\s*'${S}'\\s*,\\s*'${S}'\\s*,\\s*'${S}'`, "g"))) {
      const ar = m[1].replace(/''/g, "'"), en = m[2].replace(/''/g, "'");
      if (!/[\u0600-\u06FF]/.test(ar)) continue;   // يتخطى ما ليس صف لاعب (مثل in ('CB','LB','RB'))
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

const norm = (x) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const isFootballer = (d) => /football|soccer/i.test(d || "");
/** هل العنوان/اسم الملف يخص هذا اللاعب؟ (أي جزء من الاسم طوله 4+ حروف) */
export const nameMatches = (nameEn, title) => {
  const t = norm(title);
  return norm(nameEn).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 || norm(nameEn).split(/[^a-z0-9]+/).length === 1).some((w) => t.includes(w));
};
const IMG_EXT = /\.(jpe?g|png|webp)$/i;
const BAD_FILE = /logo|signature|autograph|flag|stadium|crest|badge|\bkit\b|jersey|trophy|map\b|infobox/i;

async function wikiPage(title) {
  const w = await getJson(`https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages|description|pageprops&ppprop=wikibase_item&piprop=name&titles=${encodeURIComponent(title)}`);
  const page = Object.values(w.query?.pages || {})[0];
  if (!page || page.missing !== undefined) return null;
  return { title: page.title, description: page.description || "", file: page.pageimage || null, qid: page.pageprops?.wikibase_item || null };
}
async function wikiSearchTitles(nameEn) {
  const j = await getJson(`https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srlimit=4&srsearch=${encodeURIComponent(nameEn + " footballer")}`);
  return (j.query?.search || []).map((x) => x.title);
}
/** يجد مقالة اللاعب: العنوان المباشر أولًا، وإن كان ملتبسًا/غير لاعب نبحث عن الأنسب. */
async function findPlayerPage(nameEn) {
  const first = TITLE_OVERRIDES[nameEn] || nameEn;
  const p = await wikiPage(first);
  if (p && isFootballer(p.description)) return { page: p, note: "" };
  for (const t of await wikiSearchTitles(nameEn)) {
    if (t === first) continue;
    const c = await wikiPage(t);
    if (c && isFootballer(c.description) && nameMatches(nameEn, c.title)) return { page: c, note: `(المقالة: ${c.title})` };
  }
  return { page: null, note: p ? `المقالة «${p.title}» ليست للاعب: «${p.description || "بلا وصف"}»` : "لا توجد مقالة ويكيبيديا بهذا الاسم" };
}
const toResult = (ii) => {
  const md = ii.extmetadata || {};
  return { url: ii.thumburl || ii.url, license: stripHtml(md.LicenseShortName?.value), licenseUrl: md.LicenseUrl?.value || "", author: stripHtml(md.Artist?.value) || "غير مذكور", source: ii.descriptionurl };
};
async function commonsFile(file) {
  const c = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640&titles=${encodeURIComponent("File:" + file.replace(/^File:/i, ""))}`);
  const ii = Object.values(c.query?.pages || {})[0]?.imageinfo?.[0];
  if (!ii) return { error: "الصورة ليست على كومنز (غالبًا غير حرّة)" };
  const r = toResult(ii);
  if (!licenseOk(r.license)) return { error: `رخصة غير مسموحة: «${r.license || "غير معروفة"}»` };
  return r;
}
async function wikidataImage(qid) {
  const j = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${qid}&property=P18`);
  return j.claims?.P18?.[0]?.mainsnak?.datavalue?.value || null;
}
/** بحث مباشر في كومنز: أول صورة برخصة مفتوحة واسم اللاعب ظاهر في اسم الملف. */
async function commonsSearch(nameEn) {
  const j = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent(nameEn)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640`);
  const pages = Object.values(j.query?.pages || {}).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  for (const pg of pages) {
    const ii = pg.imageinfo?.[0];
    if (!ii || !IMG_EXT.test(pg.title) || BAD_FILE.test(pg.title) || !nameMatches(nameEn, pg.title)) continue;
    const r = toResult(ii);
    if (licenseOk(r.license)) return r;
  }
  return null;
}

export async function lookup(nameEn) {
  const { page, note } = await findPlayerPage(nameEn);
  if (!page) return { error: note };
  const tried = [], files = [];
  if (page.file) files.push(["صورة المقالة", page.file]);
  if (page.qid) { try { const f = await wikidataImage(page.qid); if (f && f.replace(/ /g, "_") !== (page.file || "").replace(/ /g, "_")) files.push(["ويكيداتا", f]); } catch { /* تجاهل */ } }
  for (const [src, f] of files) {
    const r = await commonsFile(f);
    if (!r.error) return r;
    tried.push(`${src}: ${r.error}`);
  }
  try { const r = await commonsSearch(nameEn); if (r) return r; tried.push("بحث كومنز: لا نتيجة مناسبة"); } catch (e) { tried.push("بحث كومنز: " + e.message); }
  return { error: (note ? note + " — " : "") + (tried.join(" | ") || "لا توجد صورة حرة") };
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
  let players = await parseNames([path.join(ROOT, "supabase", "seed.sql"), path.join(ROOT, "supabase", "002_legends.sql"), path.join(ROOT, "supabase", "006_more_players.sql")]);
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
