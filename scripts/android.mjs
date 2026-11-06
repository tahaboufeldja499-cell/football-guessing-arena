// يحوّل الموقع إلى تطبيق أندرويد عبر Capacitor.
//   npm run app:init   أول مرة: يبني الموقع + ينشئ مشروع android + الأيقونة + المزامنة
//   npm run app:sync   بعد أي تعديل في الكود: يعيد البناء والمزامنة
//   npm run app:apk    يبني ملف APK (football-arena.apk في مجلد المشروع)
// أضف --dry لعرض الأوامر دون تنفيذها.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ANDROID = path.join(ROOT, "android");
const isWin = process.platform === "win32";
const dry = process.argv.includes("--dry");
const cmd = process.argv[2];

const die = (msg) => { console.error("\n✗ " + msg); process.exit(1); };
function run(c, args, { cwd = ROOT, env = {} } = {}) {
  console.log("$", [c, ...args].join(" "));
  if (dry) return;
  const r = spawnSync(c, args, { cwd, stdio: "inherit", shell: true, env: { ...process.env, ...env } });
  if (r.status !== 0) die(`فشل الأمر: ${c} ${args.join(" ")}`);
}

/** مسار صالح لملف local.properties (الشرطة المائلة العكسية والنقطتان تُهرَّبان). */
export const toPropsPath = (p) => p.replace(/\\/g, "\\\\").replace(/:/g, "\\:");

/** يضيف اتجاه الشاشة العمودي وضبط لوحة المفاتيح إلى وسم <activity> (آمن عند التكرار). */
export function patchManifest(xml) {
  return xml.replace(/<activity\b[^>]*>/, (tag) => {
    let t = tag;
    if (!/android:screenOrientation=/.test(t)) t = t.replace("<activity", '<activity android:screenOrientation="portrait"');
    if (!/android:windowSoftInputMode=/.test(t)) t = t.replace("<activity", '<activity android:windowSoftInputMode="adjustResize"');
    return t;
  });
}
function patchAndroid() {
  const f = path.join(ANDROID, "app", "src", "main", "AndroidManifest.xml");
  if (dry || !fs.existsSync(f)) return;
  const before = fs.readFileSync(f, "utf8"), after = patchManifest(before);
  if (after !== before) { fs.writeFileSync(f, after); console.log("✓ ثبّتّ الاتجاه العمودي وضبط لوحة المفاتيح في AndroidManifest.xml"); }
}

function findSdk() {
  const c = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Android", "Sdk"),
    path.join(os.homedir(), "Library", "Android", "sdk"), path.join(os.homedir(), "Android", "Sdk")].filter(Boolean);
  return c.find((p) => fs.existsSync(path.join(p, "platforms")) || fs.existsSync(path.join(p, "platform-tools")));
}
function findJava() {
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) return process.env.JAVA_HOME;
  return ["C:\\Program Files\\Android\\Android Studio\\jbr", "/Applications/Android Studio.app/Contents/jbr/Contents/Home", "/opt/android-studio/jbr"].find((p) => fs.existsSync(p));
}

/** يقرأ قيمة من .env.local (بدون طباعة المفتاح) أو من المتغيرات البيئية. */
export function envValue(name) {
  if (process.env[name]) return process.env[name];
  try {
    const m = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  } catch { return ""; }
}
const placeholder = (v) => !v || v.includes("YOUR-PROJECT-REF") || v.includes("your-");
export function checkEnv() {
  const url = envValue("NEXT_PUBLIC_SUPABASE_URL"), key = envValue("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const ok = !placeholder(url) && !placeholder(key);
  console.log(`مفاتيح Supabase: URL ${placeholder(url) ? "✗ ناقص" : "✓"} • KEY ${placeholder(key) ? "✗ ناقص" : "✓"}`);
  if (!ok && !process.env.ALLOW_NO_SUPABASE) die(
    "مفاتيح Supabase غير موجودة وقت البناء، فسيُبنى التطبيق بدون أونلاين (والخطأ يُحفظ داخل ملف APK).\n" +
    "  • محليًا: ضعها في .env.local\n" +
    "  • على GitHub: Settings ← Secrets and variables ← Actions ← Secrets ← أضف NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY\n" +
    "  • لبناء نسخة محلية فقط (بدون أونلاين) عمدًا: ALLOW_NO_SUPABASE=1");
  return ok ? url : "";
}
/** يتأكد أن عنوان Supabase موجود فعلًا داخل ملفات JavaScript المبنية في out/. */
export function verifyEmbedded(url) {
  if (!url || dry) return;
  const host = new URL(url).host;
  const stack = [path.join(ROOT, "out", "_next")];
  while (stack.length) {
    const d = stack.pop();
    for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name.endsWith(".js") && fs.readFileSync(p, "utf8").includes(host)) { console.log("✓ مفاتيح Supabase مدمجة داخل التطبيق"); return; }
    }
  }
  die("بُني التطبيق لكن عنوان Supabase غير موجود داخل ملفاته. تحقق من أسماء المتغيرات (NEXT_PUBLIC_...) وأعد البناء.");
}
function buildWeb() {
  const url = checkEnv();
  run("npx", ["next", "build"], { env: { BUILD_TARGET: "app" } });
  if (!dry && !fs.existsSync(path.join(ROOT, "out", "index.html"))) die("لم يُنتَج مجلد out. راجع أخطاء البناء أعلاه.");
  verifyEmbedded(url);
}
function ensureSdk() {
  const lp = path.join(ANDROID, "local.properties");
  const sdk = findSdk();
  if (!sdk) { if (dry) return console.log("(سيُبحث عن Android SDK)"); die("لم أجد Android SDK. ثبّت Android Studio (يثبّت الـ SDK تلقائيًا) ثم أعد المحاولة، أو عرّف ANDROID_HOME."); }
  if (!fs.existsSync(lp) && !dry) { fs.writeFileSync(lp, `sdk.dir=${toPropsPath(sdk)}\n`); console.log("✓ كتبت android/local.properties →", sdk); }
}

function init() {
  buildWeb();
  if (!fs.existsSync(ANDROID) || dry) run("npx", ["cap", "add", "android"]);
  else console.log("✓ مجلد android موجود، سأتخطى cap add");
  run("npx", ["@capacitor/assets", "generate", "--android", "--iconBackgroundColor", '"#050908"', "--iconBackgroundColorDark", '"#050908"', "--splashBackgroundColor", '"#050908"', "--splashBackgroundColorDark", '"#050908"']);
  run("npx", ["cap", "sync", "android"]);
  patchAndroid();
  console.log("\n✓ تم. الخطوة التالية:  npm run app:apk");
}
function sync() {
  if (!fs.existsSync(ANDROID) && !dry) die("لا يوجد مجلد android. شغّل أولًا:  npm run app:init");
  buildWeb(); run("npx", ["cap", "sync", "android"]);
}
function apk() {
  sync(); ensureSdk();
  const gradle = isWin ? ".\\gradlew.bat" : "./gradlew";
  if (!isWin && !dry) { try { fs.chmodSync(path.join(ANDROID, "gradlew"), 0o755); } catch { /* ignore */ } }
  const java = findJava();
  run(gradle, ["assembleDebug"], { cwd: ANDROID, env: java ? { JAVA_HOME: java } : {} });
  const built = path.join(ANDROID, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
  if (dry) return;
  if (!fs.existsSync(built)) die("انتهى gradle لكن ملف APK غير موجود في: " + built);
  const out = path.join(ROOT, "football-arena.apk");
  fs.copyFileSync(built, out);
  console.log(`\n✓ جاهز: ${out}\n  انقله إلى هاتفك وثبّته (فعّل «التثبيت من مصادر غير معروفة» عند الطلب).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (cmd === "init") init(); else if (cmd === "sync") sync(); else if (cmd === "apk") apk();
  else die("الأمر غير معروف. استعمل:  npm run app:init | app:sync | app:apk");
}
