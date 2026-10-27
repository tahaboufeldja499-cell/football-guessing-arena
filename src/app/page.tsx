"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Backdrop from "@/components/Backdrop";
import Icon from "@/components/Icon";
import Intro from "@/components/Intro";
import SettingsModal from "@/components/SettingsModal";
import { Logo } from "@/components/ui";
import { ASSETS } from "@/lib/assets";
import { arabicError } from "@/lib/errors";
import { audio } from "@/lib/sounds";
import { extractRoomCode } from "@/lib/utils";
import { ensureUser, isConfigured, supabase } from "@/lib/supabase";

type View = "menu" | "mode" | "create" | "join";
type IconName = Parameters<typeof Icon>[0]["name"];

function Panel({ icon, title, sub, onClick, soon, hero, badge = "قريبًا" }: { icon: IconName; title: string; sub: string; onClick?: () => void; soon?: boolean; hero?: boolean; badge?: string }) {
  return (
    <button type="button" className={`panel ${hero ? "panel-hero py-7" : ""}`} onClick={onClick} disabled={soon}>
      <span className="panel-icon" style={hero ? { width: 64, height: 64 } : undefined}><Icon name={icon} size={hero ? 34 : 24} /></span>
      <span className="min-w-0 flex-1">
        <span className={`block font-black ${hero ? "text-3xl" : "text-lg"}`}>{title}</span>
        <span className="block text-sm text-white/60">{sub}</span>
      </span>
      {soon && <span className="absolute left-3 top-3 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] font-bold text-gold">{badge}</span>}
    </button>
  );
}

export default function Home() {
  const router = useRouter();
  const [intro, setIntro] = useState<boolean | null>(null);
  const [view, setView] = useState<View>("menu");
  const [nick, setNick] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    let show = true;
    try {
      setNick(localStorage.getItem("fga-nick") ?? "");
      show = sessionStorage.getItem("fga-intro") !== "1" && localStorage.getItem("fga-intro-off") !== "1";
    } catch { /* ignore */ }
    setIntro(show);
  }, []);

  useEffect(() => { audio.setMood("menu"); }, []);

  const go = (v: View) => { setErr(""); setView(v); };

  function validNick() {
    const n = nick.trim();
    if (n.length < 2 || n.length > 20) { setErr("اكتب اسمًا مستعارًا بين حرفين و20 حرفًا."); return null; }
    try { localStorage.setItem("fga-nick", n); } catch { /* ignore */ }
    return n;
  }
  async function create() {
    setErr(""); const n = validNick(); if (!n) return;
    setBusy(true);
    try {
      await ensureUser();
      const { data, error } = await supabase.rpc("create_room", { p_nickname: n });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      router.push(`/room?code=${row.code}`);
    } catch (e) { setErr(arabicError(e)); setBusy(false); }
  }
  function join() {
    setErr(""); if (!validNick()) return;
    const c = extractRoomCode(code);
    if (c.length < 4) { setErr("اكتب رمز الغرفة أو الصق رابط الدعوة."); return; }
    router.push(`/room?code=${c}`);
  }

  if (intro === null) return <div className="fixed inset-0 z-[80] bg-black" />;

  const NickField = (
    <div>
      <label htmlFor="nick" className="mb-1 block text-sm text-white/60">اسمك المستعار</label>
      <input id="nick" className="input text-center" maxLength={20} placeholder="مثال: نجم الملعب" value={nick} onChange={(e) => setNick(e.target.value)} />
    </div>
  );
  const Back = ({ to }: { to: View }) => <button className="btn-ghost w-full" onClick={() => go(to)}>رجوع</button>;
  const Err = err ? <p role="alert" className="text-center text-sm font-bold text-red-300">{err}</p> : null;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-12 pt-8">
      <Backdrop src={ASSETS.homeBg} dim={0.42} />
      {intro && <Intro onDone={() => setIntro(false)} />}
      <div className="mb-8 flex justify-center animate-rise"><Logo /></div>

      {view === "menu" && (
        <section className="space-y-3 animate-rise">
          <div className="mb-5 text-center">
            <h1 className="text-3xl font-black leading-tight [text-shadow:0_2px_14px_rgba(0,0,0,.85)] sm:text-4xl">هل تستطيع كشف هوية <span className="text-gold">النجم</span>؟</h1>
            <p className="mt-2 text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,.9)]">كلٌّ منكما يخفي لاعبًا، ومن يكشف لاعب الآخر أولًا يفوز.</p>
          </div>
          {!isConfigured && (
            <div role="alert" className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-gold">
              الأونلاين غير مفعّل في هذه النسخة: لم تُضبط مفاتيح Supabase وقت البناء. اللعب المحلي والمعرض يعملان بشكل كامل.
            </div>
          )}
          <Panel hero icon="play" title="العب الآن" sub="اختر نمط المباراة وابدأ التحدي" onClick={() => go("mode")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Panel icon="users" title="إنشاء غرفة أونلاين" sub="غرفة خاصة تدعو إليها صديقك" onClick={() => go("create")} soon={!isConfigured} badge="غير مفعّل" />
            <Panel icon="key" title="الانضمام برمز" sub="ادخل غرفة صديقك بالرمز" onClick={() => go("join")} soon={!isConfigured} badge="غير مفعّل" />
            <Panel icon="phone" title="اللعب المحلي" sub="جهاز واحد تمرّرانه بينكما" onClick={() => router.push("/local")} />
            <Panel icon="layers" title="معرض اللاعبين" sub="تصفّح كل البطاقات والحزم" onClick={() => router.push("/gallery")} />
          </div>
          <Panel icon="sliders" title="الإعدادات" sub="الصوت والمقدمة" onClick={() => setSettings(true)} />
        </section>
      )}

      {view === "mode" && (
        <section className="space-y-4 animate-rise">
          <h2 className="text-center text-2xl font-black">اختر نمط المباراة</h2>
          <div className="panel-hero glass space-y-3 p-5">
            <div className="flex items-center gap-3"><span className="panel-icon"><Icon name="users" /></span>
              <div><div className="text-xl font-black">أونلاين</div><div className="text-sm text-white/65">كلٌّ على جهازه، مزامنة لحظية</div></div></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button className="btn-primary" disabled={!isConfigured} onClick={() => go("create")}>إنشاء غرفة</button>
              <button className="btn-ghost" disabled={!isConfigured} onClick={() => go("join")}>انضمام برمز</button>
            </div>
          </div>
          <button type="button" className="panel w-full" onClick={() => router.push("/local")}>
            <span className="panel-icon"><Icon name="phone" /></span>
            <span><span className="block text-xl font-black">محلي</span><span className="block text-sm text-white/65">جهاز واحد بالتناوب مع شاشة تغطية تخفي لاعبك السري</span></span>
          </button>
          <Back to="menu" />
        </section>
      )}

      {view === "create" && (
        <section className="glass mx-auto max-w-md space-y-4 p-6 animate-rise">
          <h2 className="text-center text-2xl font-black">إنشاء غرفة</h2>
          {NickField}
          <button className="btn-primary w-full text-lg" disabled={busy} onClick={create}>{busy ? "جارٍ الإنشاء…" : "إنشاء الغرفة"}</button>
          {Err}<Back to="menu" />
        </section>
      )}

      {view === "join" && (
        <section className="glass mx-auto max-w-md space-y-4 p-6 animate-rise">
          <h2 className="text-center text-2xl font-black">الانضمام إلى غرفة</h2>
          {NickField}
          <div>
            <label htmlFor="code" className="mb-1 block text-sm text-white/60">رمز الغرفة أو رابط الدعوة</label>
            <input id="code" className="input text-center tracking-[.25em]" dir="ltr" value={code} placeholder="ABC123"
              onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && join()} />
          </div>
          <button className="btn-primary w-full text-lg" onClick={join}>انضمام</button>
          {Err}<Back to="menu" />
        </section>
      )}

      <p className="mt-8 text-center text-xs text-white/50"><a href="/credits" className="underline hover:text-white">الحقوق ومصادر الصور</a></p>
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
    </main>
  );
}
