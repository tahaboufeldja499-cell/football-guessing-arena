"use client";
import { useEffect, useMemo, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { ASSETS } from "@/lib/assets";
import { initialState, matchWinner, MIN_POOL, reducer, type Answer, type LocalState, type P } from "@/lib/localGame";
import { inPacks, PACKS, type Pack } from "@/lib/packs";
import { QUICK_QUESTIONS } from "@/lib/quickQuestions";
import { audio, sfx } from "@/lib/sounds";
import type { Footballer } from "@/lib/types";
import { useFootballers } from "@/lib/useFootballers";
import { cx } from "@/lib/utils";
import Backdrop from "./Backdrop";
import { FootballerCard, PlayersGrid } from "./FootballerCard";
import Icon from "./Icon";
import { FlipCard } from "./RoundEnd";
import { Confetti, Logo, PlayerAvatar } from "./ui";

type D = (a: Parameters<typeof reducer>[1]) => void;
const other = (p: P): P => (p === 0 ? 1 : 0);
const ANS: Record<Answer, { t: string; c: string }> = {
  yes: { t: "نعم ✓", c: "text-neon" }, no: { t: "لا ✕", c: "text-red-300" }, unsure: { t: "غير متأكد", c: "text-gold" },
};

/* ---------- الإعداد ---------- */
function SetupView({ all, d }: { all: Footballer[]; d: D }) {
  const router = useRouter();
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [packs, setPacks] = useState<Pack[]>(["stars", "legends", "algeria", "arab"]);
  const [rounds, setRounds] = useState(3);
  const pool = useMemo(() => all.filter((f) => inPacks(f, packs)).map((f) => f.id), [all, packs]);
  const count = (p: Pack) => all.filter((f) => inPacks(f, [p])).length;
  const toggle = (p: Pack) => setPacks((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  return (
    <section className="mx-auto max-w-md space-y-4 animate-rise">
      <div className="glass space-y-4 p-5">
        <h1 className="text-center text-2xl font-black">اللعب المحلي</h1>
        <p className="text-center text-sm text-white/65">جهاز واحد تمرّرانه بينكما. قبل كل تمرير تظهر شاشة تغطية تخفي لاعبك السري عن الخصم.</p>
        {[[n1, setN1, "اللاعب الأول"], [n2, setN2, "اللاعب الثاني"]].map(([v, set, ph], i) => (
          <div key={i} className="flex items-center gap-3">
            <PlayerAvatar size={44} />
            <input className="input" maxLength={20} placeholder={ph as string} value={v as string} onChange={(e) => (set as (s: string) => void)(e.target.value)} aria-label={ph as string} />
          </div>
        ))}
        <div>
          <div className="mb-2 text-sm font-bold text-gold">حزم اللاعبين</div>
          <div className="grid grid-cols-2 gap-2">
            {PACKS.map((p) => (
              <button key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={packs.includes(p.id)}
                className={cx("rounded-xl border p-3 text-right transition", packs.includes(p.id) ? "border-neon bg-neon/10" : "border-white/10 bg-white/5 opacity-70")}>
                <div className="font-bold">{p.title}</div>
                <div className="text-xs text-white/55">{count(p.id)} لاعبًا • {p.hint}</div>
              </button>
            ))}
          </div>
          <div className={cx("mt-2 text-sm", pool.length < MIN_POOL ? "text-red-300" : "text-white/60")}>
            {pool.length < MIN_POOL ? `اختر حزمًا تكفي (الحد الأدنى ${MIN_POOL} لاعبين)` : `إجمالي اللاعبين في المباراة: ${pool.length}`}
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm font-bold text-gold">عدد الجولات</div>
          <div className="flex gap-2">{[1, 3, 5].map((r) => (
            <button key={r} type="button" onClick={() => setRounds(r)} aria-pressed={rounds === r} className={cx("btn flex-1 border", rounds === r ? "border-neon bg-neon/15 text-neon" : "border-white/15 bg-white/5")}>{r}</button>
          ))}</div>
        </div>
        <button className="btn-primary w-full text-lg" disabled={pool.length < MIN_POOL} onClick={() => d({ t: "START", names: [n1, n2], pool, rounds })}>ابدأ المباراة</button>
        <button className="btn-ghost w-full" onClick={() => router.push("/")}>العودة للقائمة</button>
      </div>
    </section>
  );
}

/* ---------- شاشة التغطية: تستبدل الصفحة كلها (لا طبقة شفافة فوق المحتوى) ---------- */
export function CoverView({ s, onReady }: { s: LocalState; onReady: () => void }) {
  const c = s.cover!, name = s.names[c.for], opp = s.names[other(c.for)];
  const msg = c.after === "pick" ? `اختر لاعبك السرّي، ولا تدع ${opp} يرى الشاشة.`
    : s.pending ? `عندك سؤال من ${opp} ينتظر إجابتك.` : "حان دورك لتسأل أو تخمّن.";
  return (
    <div className="fixed inset-0 z-[65] grid place-items-center p-6 text-center" style={{ background: "radial-gradient(ellipse at 50% 40%, #0c2a20, #050908 70%)" }}>
      <div className="max-w-sm space-y-4 animate-pop">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-gold/40 text-gold"><Icon name="phone" size={34} /></div>
        <div className="text-white/70">مرّر الجهاز إلى</div>
        <div className="text-5xl font-black text-gold [text-shadow:0_2px_18px_rgba(0,0,0,.8)]">{name}</div>
        <p className="text-white/75">{msg}</p>
        <button className="btn-primary w-full py-4 text-xl" onClick={onReady} data-nosound>أنا {name}، جاهز</button>
        <div className="text-xs text-white/45">الجولة {s.round} من {s.totalRounds} • {s.names[0]} {s.scores[0]} - {s.scores[1]} {s.names[1]}</div>
      </div>
    </div>
  );
}

/* ---------- اختيار اللاعب السرّي ---------- */
export function PickView({ s, d, pool }: { s: LocalState; d: D; pool: Footballer[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const chosen = pool.find((f) => f.id === sel);
  return (
    <div className="pb-28">
      <div className="mb-4 text-center">
        <div className="text-sm text-white/65">الجولة {s.round} من {s.totalRounds}</div>
        <h2 className="text-2xl font-black">{s.names[s.who]}، اختر لاعبك السرّي</h2>
        <p className="text-sm text-white/60">بعد التأكيد يُخفى اختيارك فورًا ولا يمكن تغييره.</p>
      </div>
      <PlayersGrid footballers={pool} selectedId={sel} onSelect={setSel} />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink/90 p-3 backdrop-blur" style={{ paddingBottom: "calc(.75rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1 truncate text-sm">{chosen ? <>اللاعب: <b className="text-neon">{chosen.name_ar}</b></> : "اضغط على بطاقة لاعب"}</div>
          <button className="btn-primary" disabled={!sel} onClick={() => { if (sel) { sfx.select(); d({ t: "PICK", id: sel }); } }}>تأكيد الاختيار</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- نافذة التخمين ---------- */
function GuessDialog({ pool, used, oppName, onGuess, onClose }: { pool: Footballer[]; used: Set<number>; oppName: string; onGuess: (id: number) => void; onClose: () => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const f = pool.find((x) => x.id === sel);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="تخمين اللاعب السرّي">
      <div className="glass flex max-h-[92vh] w-full max-w-3xl flex-col rounded-b-none bg-ink/95 p-4 animate-rise sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xl font-black">من هو لاعب {oppName} السرّي؟</h3>
          <button className="btn-ghost px-3 py-1" onClick={onClose} aria-label="إغلاق"><Icon name="close" size={18} /></button>
        </div>
        {confirm && f ? (
          <div className="grid place-items-center gap-4 py-8 text-center">
            <div className="text-lg">هل أنت متأكد أن لاعب {oppName} هو <b className="text-neon">{f.name_ar}</b>؟</div>
            <div className="text-sm text-white/60">إن أخطأت يُفقدك ذلك دورك.</div>
            <div className="flex gap-2"><button className="btn-primary" onClick={() => onGuess(f.id)}>نعم، أؤكد التخمين</button><button className="btn-ghost" onClick={() => setConfirm(false)}>رجوع</button></div>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto pb-2"><PlayersGrid footballers={pool} selectedId={sel} disabledIds={used} onSelect={setSel} /></div>
            <div className="mt-3 flex items-center gap-3 border-t border-white/10 pt-3">
              <div className="min-w-0 flex-1 truncate text-sm">{f ? <>اخترت: <b className="text-neon">{f.name_ar}</b></> : "اختر لاعبًا لتخمينه"}</div>
              <button className="btn-primary" disabled={!sel} onClick={() => setConfirm(true)}>متابعة</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- الدور: إجابة سؤال ثم سؤال/تخمين ---------- */
export function TurnView({ s, d, pool, byId }: { s: LocalState; d: D; pool: Footballer[]; byId: Map<number, Footballer> }) {
  const me = s.who, opp = other(me), myName = s.names[me], oppName = s.names[opp];
  const pq = s.pending && s.pending.by !== me ? s.log.find((l) => l.id === s.pending!.id) ?? null : null;   // سؤال موجّه إليّ
  const mySecret = s.secrets[me] !== null ? byId.get(s.secrets[me]!) : undefined;                       // سرّي أنا فقط
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<Answer | null>(null);
  const [guessOpen, setGuessOpen] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const excluded = useMemo(() => new Set(s.excluded[me]), [s.excluded, me]);

  const ask = (b: string) => { const t = b.trim(); if (!t) return; sfx.ask(); d({ t: "ASK", text: t }); };
  const answer = () => { if (!choice) return; (choice === "yes" ? sfx.yes : choice === "no" ? sfx.no : sfx.unsure)(); d({ t: "ANSWER", a: choice }); };
  const guess = (id: number) => { if (id !== s.secrets[opp]) sfx.wrong(); setGuessOpen(false); d({ t: "GUESS", id }); };
  const nameOfFb = (id?: number) => (id ? byId.get(id)?.name_ar : "") ?? "";

  return (
    <div className="space-y-3 pb-10">
      <header className="glass flex items-center justify-between gap-2 p-3">
        <div className="min-w-0 text-center"><div className="truncate text-sm font-bold">{s.names[0]}</div><div className="text-3xl font-black text-neon">{s.scores[0]}</div></div>
        <div className="text-center text-xs text-white/60"><div className="font-bold text-gold">الجولة {s.round} من {s.totalRounds}</div><div>VS</div></div>
        <div className="min-w-0 text-center"><div className="truncate text-sm font-bold">{s.names[1]}</div><div className="text-3xl font-black">{s.scores[1]}</div></div>
      </header>
      <div role="status" className="rounded-2xl border border-neon bg-neon/15 px-4 py-3 text-center font-black text-neon">
        {pq ? `سؤال من ${oppName} — أجب بحسب لاعبك السرّي يا ${myName}` : `دورك يا ${myName}: اسأل ${oppName} أو خمّن`}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          {pq && (
            <section className="glass border-neon/50 p-5 text-center animate-pop">
              <div className="text-sm text-white/60">{oppName} يسأل عن لاعبك السرّي:</div>
              <div className="my-4 text-2xl font-black leading-snug">{pq.text}</div>
              {mySecret && <div className="mx-auto mb-4 w-40"><div className="mb-1 text-xs text-white/55">لاعبك السرّي (لا يراه {oppName})</div><FootballerCard f={mySecret} big /></div>}
              <div className="grid grid-cols-3 gap-2">
                {(["yes", "no", "unsure"] as Answer[]).map((a) => (
                  <button key={a} onClick={() => setChoice(a)} aria-pressed={choice === a} data-nosound
                    className={cx("rounded-2xl border-2 py-4 text-lg font-black transition active:scale-95",
                      choice === a ? (a === "yes" ? "border-neon bg-neon text-ink" : a === "no" ? "border-red-400 bg-red-500 text-white" : "border-gold bg-gold text-ink")
                        : a === "yes" ? "border-neon/40 bg-neon/10 text-neon" : a === "no" ? "border-red-400/40 bg-red-500/10 text-red-300" : "border-gold/40 bg-gold/10 text-gold")}>{ANS[a].t}</button>
                ))}
              </div>
              <button className="btn-primary mt-4 w-full" disabled={!choice} onClick={answer} data-nosound>تأكيد الإجابة</button>
              <p className="mt-2 text-xs text-white/45">أنت من يقرر الإجابة، ولا يمكن تغييرها بعد التأكيد.</p>
            </section>
          )}

          {!pq && (
            <section className="glass space-y-4 p-4 animate-rise">
              <div>
                <label htmlFor="lq" className="mb-1 block font-black">اكتب سؤالك عن اللاعب</label>
                <textarea id="lq" className="input min-h-[84px] resize-none" maxLength={200} placeholder="مثال: هل لاعبك يلعب في ريال مدريد؟" value={text}
                  onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(text); } }} />
                <div className="mt-2 flex items-center justify-between"><span className="text-xs text-white/40">{text.length}/200</span>
                  <button className="btn-primary" disabled={!text.trim()} onClick={() => ask(text)} data-nosound>إرسال السؤال</button></div>
              </div>
              <div>
                <div className="mb-2 font-black text-gold">أسئلة سريعة</div>
                <div className="space-y-2">{QUICK_QUESTIONS.map((g) => (
                  <div key={g.title}><div className="mb-1 text-xs text-white/50">{g.title}</div>
                    <div className="flex flex-wrap gap-2">{g.items.map((it) => <button key={it} className="chip" onClick={() => ask(it)} data-nosound>{it}</button>)}</div></div>
                ))}</div>
              </div>
              <button className="btn-ghost w-full border-gold/50 text-gold" onClick={() => setGuessOpen(true)}><Icon name="target" size={20} />خمّن اللاعب السرّي</button>
            </section>
          )}

          <section className="glass p-3">
            <div className="mb-2 font-black">سجل الجولة</div>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {s.log.length === 0 && <div className="py-6 text-center text-sm text-white/40">لا توجد أسئلة بعد.</div>}
              {s.log.map((l) => l.kind === "q" ? (
                <div key={l.id} className={cx("rounded-xl p-3 text-sm", l.by === me ? "bg-neon/10" : "bg-white/5")}>
                  <div className="text-xs text-white/50">{s.names[l.by]} سأل:</div><div className="font-bold">{l.text}</div>
                  <div className={cx("mt-1 text-xs font-black", l.answer ? ANS[l.answer].c : "text-gold")}>{l.answer ? `الإجابة: ${ANS[l.answer].t}` : "بانتظار الإجابة…"}</div>
                </div>
              ) : (
                <div key={l.id} className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm">
                  <Icon name="target" size={15} className="ml-1 inline text-gold" />{s.names[l.by]} خمّن <b>{nameOfFb(l.footballerId)}</b> — <span className="text-red-300">خطأ ✕</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside>
          <section className="glass p-3 text-center">
            <div className="mb-2 flex items-center justify-between text-sm"><b>لاعبك السرّي</b>
              <button className="text-xs text-neon underline" onClick={() => setShowSecret((v) => !v)}>{showSecret ? "إخفاء" : "إظهار"}</button></div>
            {showSecret && mySecret ? <div className="mx-auto w-40"><FootballerCard f={mySecret} big /></div>
              : /* eslint-disable-next-line @next/next/no-img-element */ <div className="mx-auto w-40"><img className="mystery-img" src={ASSETS.mystery} alt="بطاقتك مخفية" /></div>}
          </section>
        </aside>
      </div>

      <section className="glass p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-1"><b>لوحة اللاعبين</b>
          <span className="text-xs text-white/50">المتبقي: {pool.length - excluded.size} من {pool.length} • اضغط لاستبعاد/إرجاع لاعب (خاص بك)</span></div>
        <PlayersGrid footballers={pool} excluded={excluded} onSelect={(id) => d({ t: "TOGGLE_EX", id })} />
      </section>

      {guessOpen && <GuessDialog pool={pool} used={new Set(s.guessed[me])} oppName={oppName} onGuess={guess} onClose={() => setGuessOpen(false)} />}
    </div>
  );
}

/* ---------- نهاية الجولة والمباراة ---------- */
function RoundEndView({ s, d, byId }: { s: LocalState; d: D; byId: Map<number, Footballer> }) {
  const w = s.roundWinner!;
  const last = s.round >= s.totalRounds;
  return (
    <div className="mx-auto max-w-xl space-y-4 py-4 text-center">
      <Confetti />
      <div className="text-sm text-white/70">انتهت الجولة {s.round} من {s.totalRounds}</div>
      <h2 className="flex items-center justify-center gap-2 text-3xl font-black text-gold [text-shadow:0_2px_14px_rgba(0,0,0,.85)]"><Icon name="trophy" size={32} />فاز {s.names[w]} بالجولة!</h2>
      <div className="grid grid-cols-2 gap-3">
        {([0, 1] as P[]).map((p) => <FlipCard key={p} f={s.secrets[p] !== null ? byId.get(s.secrets[p]!) : undefined} label={`لاعب ${s.names[p]} السرّي`} delay={500 + p * 450} />)}
      </div>
      <div className="glass flex items-center justify-around p-4 text-xl font-black">
        <div>{s.names[0]}<div className="text-4xl text-neon">{s.scores[0]}</div></div><div className="text-white/40">—</div><div>{s.names[1]}<div className="text-4xl">{s.scores[1]}</div></div>
      </div>
      <button className="btn-primary w-full" onClick={() => { sfx.round(); d({ t: "NEXT" }); }}>{last ? "النتيجة النهائية" : "الجولة التالية"}</button>
    </div>
  );
}

function FinalView({ s, d }: { s: LocalState; d: D }) {
  const router = useRouter();
  const w = matchWinner(s);
  return (
    <div className="mx-auto max-w-xl space-y-4 py-4 text-center">
      {w !== null && <Confetti />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ASSETS.trophy} alt="كأس البطولة" width={240} height={320} className="trophy-img h-64 w-auto sm:h-72" />
      <h2 className="text-4xl font-black text-gold [text-shadow:0_2px_16px_rgba(0,0,0,.9)]">{w === null ? "تعادل!" : `${s.names[w]} بطل المباراة!`}</h2>
      <div className="glass flex items-center justify-around p-5 text-xl font-black">
        <div>{s.names[0]}<div className="text-5xl text-neon">{s.scores[0]}</div></div><div className="text-white/50">النتيجة النهائية</div><div>{s.names[1]}<div className="text-5xl">{s.scores[1]}</div></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary flex-1" onClick={() => d({ t: "REMATCH" })}>إعادة المباراة</button>
        <button className="btn-ghost flex-1" onClick={() => d({ t: "RESET" })}>مباراة جديدة</button>
        <button className="btn-ghost" onClick={() => router.push("/")}>القائمة</button>
      </div>
    </div>
  );
}

/* ---------- الحاوية ---------- */
export default function LocalGame() {
  const router = useRouter();
  const all = useFootballers();
  const [s, d] = useReducer(reducer, initialState);
  const byId = useMemo(() => new Map(all.map((f) => [f.id, f])), [all]);
  const pool = useMemo(() => s.pool.map((id) => byId.get(id)).filter((f): f is Footballer => !!f), [s.pool, byId]);

  useEffect(() => { audio.setMood(s.phase === "turn" ? "match" : s.phase === "roundEnd" || s.phase === "final" ? "win" : "menu"); }, [s.phase]);
  useEffect(() => {
    if (s.phase === "cover") sfx.cover();
    else if (s.phase === "roundEnd") sfx.round();
    else if (s.phase === "final" && matchWinner(s) !== null) sfx.win();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase]);

  // التغطية تستبدل الصفحة بالكامل: لا يبقى أي محتوى لاعب في الـ DOM
  if (s.phase === "cover" && s.cover) return <CoverView s={s} onReady={() => d({ t: "READY" })} />;

  const bg = s.phase === "turn" ? { src: ASSETS.matchBg, dim: 0.5 } : s.phase === "roundEnd" || s.phase === "final" ? { src: ASSETS.victoryBg, dim: 0.4 } : { src: ASSETS.homeBg, dim: 0.5 };
  return (
    <div className="mx-auto max-w-5xl px-3 pb-10 pt-3">
      <Backdrop src={bg.src} dim={bg.dim} />
      <div className="mb-3 flex items-center justify-between gap-2">
        <Logo small />
        {s.phase !== "setup" && (
          <button className="btn-ghost px-3 py-1.5 text-red-300" onClick={() => { if (confirm("إنهاء المباراة والعودة للقائمة؟")) router.push("/"); }}>إنهاء</button>
        )}
      </div>
      {s.phase === "setup" && <SetupView all={all} d={d} />}
      {s.phase === "pick" && <PickView key={`${s.round}-${s.who}`} s={s} d={d} pool={pool} />}
      {s.phase === "turn" && <TurnView key={`${s.round}-${s.who}-${s.seq}-${s.pending?.id ?? 0}`} s={s} d={d} pool={pool} byId={byId} />}
      {s.phase === "roundEnd" && <RoundEndView s={s} d={d} byId={byId} />}
      {s.phase === "final" && <FinalView s={s} d={d} />}
    </div>
  );
}
