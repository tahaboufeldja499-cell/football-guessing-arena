"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RoomCtx } from "@/lib/ctx";
import { QUICK_QUESTIONS } from "@/lib/quickQuestions";
import { isOnline } from "@/lib/useRoom";
import { cx } from "@/lib/utils";
import { FootballerCard, PlayersGrid } from "./FootballerCard";
import GuessModal from "./GuessModal";
import { StatusDot } from "./ui";

export default function MatchScreen({ ctx }: { ctx: RoomCtx }) {
  const { room, me, opp, userId, questions, guesses, footballers, myPick, rpc, busy, roundNo, info, players } = ctx;
  const pending = questions.find((q) => q.id === room.pending_question) ?? null;
  const myTurn = room.turn_uid === userId;
  const iAnswer = !!pending && pending.asker !== userId;
  const iWait = !!pending && pending.asker === userId;
  const oppName = opp?.nickname ?? "خصمك";

  const [text, setText] = useState("");
  const [choice, setChoice] = useState<boolean | null>(null);
  const [guessOpen, setGuessOpen] = useState(false);
  const [showSecret, setShowSecret] = useState(true);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const exKey = `fga-ex-${room.id}-${room.current_round}`;
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setChoice(null); }, [pending?.id]);
  useEffect(() => {
    try { setExcluded(new Set(JSON.parse(localStorage.getItem(exKey) ?? "[]") as number[])); } catch { setExcluded(new Set()); }
  }, [exKey]);
  function toggleEx(id: number) {
    setExcluded((prev) => {
      const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id);
      try { localStorage.setItem(exKey, JSON.stringify(Array.from(n))); } catch { /* ignore */ }
      return n;
    });
  }

  const log = useMemo(() => {
    const items = [
      ...questions.map((q) => ({ t: q.created_at, kind: "q" as const, q })),
      ...guesses.map((g) => ({ t: g.created_at, kind: "g" as const, g })),
    ];
    return items.sort((a, b) => a.t.localeCompare(b.t));
  }, [questions, guesses]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [log.length, pending?.answer]);

  const nameOf = (uid: string) => players.find((p) => p.user_id === uid)?.nickname ?? "لاعب";
  const mine = footballers.find((f) => f.id === myPick);

  async function send(body: string) {
    const b = body.trim();
    if (!b) return;
    const r = await rpc("ask_question", { p_room: room.id, p_body: b });
    if (r.ok) setText("");
  }
  async function answer() {
    if (choice === null || !pending) return;
    const r = await rpc("answer_question", { p_room: room.id, p_question: pending.id, p_answer: choice });
    if (r.ok) info("إجابتك وصلت إلى خصمك");
  }

  const banner = iAnswer ? { t: "وصل سؤال جديد، أجب عنه الآن", c: "border-neon bg-neon/15 text-neon animate-glow" }
    : iWait ? { t: "تم إرسال سؤالك، ننتظر إجابة خصمك...", c: "border-gold/50 bg-gold/10 text-gold" }
    : myTurn ? { t: "دورك الآن، يمكنك طرح سؤال جديد أو التخمين", c: "border-neon bg-neon/15 text-neon" }
    : { t: `${oppName} يكتب سؤاله...`, c: "border-white/15 bg-white/5 text-white/80" };

  return (
    <div className="space-y-3 pb-10">
      <header className="glass flex items-center justify-between gap-2 p-3">
        <div className="min-w-0 text-center">
          <div className="truncate text-sm font-bold">{me.nickname} <span className="text-neon">(أنت)</span></div>
          <div className="text-3xl font-black text-neon">{me.score}</div>
        </div>
        <div className="text-center text-xs text-white/60">
          <div className="font-bold text-gold">الجولة {roundNo} من {room.total_rounds}</div>
          <div>VS</div>
        </div>
        <div className="min-w-0 text-center">
          <div className="flex items-center justify-center gap-1.5 truncate text-sm font-bold"><StatusDot online={isOnline(opp)} />{oppName}</div>
          <div className="text-3xl font-black">{opp?.score ?? 0}</div>
        </div>
      </header>

      <div role="status" className={cx("rounded-2xl border px-4 py-3 text-center font-black transition", banner.c)}>{banner.t}</div>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {iAnswer && pending && (
            <section className="glass border-neon/50 p-5 text-center animate-pop">
              <div className="text-sm text-white/60">{nameOf(pending.asker)} يسأل عن لاعبك السرّي:</div>
              <div className="my-4 text-2xl font-black leading-snug">{pending.body}</div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setChoice(true)} aria-pressed={choice === true}
                  className={cx("rounded-2xl border-2 py-5 text-2xl font-black transition active:scale-95", choice === true ? "border-neon bg-neon text-ink" : "border-neon/40 bg-neon/10 text-neon")}>نعم ✓</button>
                <button onClick={() => setChoice(false)} aria-pressed={choice === false}
                  className={cx("rounded-2xl border-2 py-5 text-2xl font-black transition active:scale-95", choice === false ? "border-red-400 bg-red-500 text-white" : "border-red-400/40 bg-red-500/10 text-red-300")}>لا ✕</button>
              </div>
              <button className="btn-primary mt-4 w-full" disabled={choice === null || busy} onClick={answer}>تأكيد الإجابة</button>
              <p className="mt-2 text-xs text-white/45">أنت من يقرر الإجابة. لا يمكن تغييرها بعد التأكيد.</p>
            </section>
          )}

          {iWait && pending && (
            <section className="glass p-5 text-center animate-pop">
              <div className="text-sm text-white/60">سؤالك:</div>
              <div className="my-2 text-xl font-black">{pending.body}</div>
              <div className="flex items-center justify-center gap-2 text-gold"><span className="h-2 w-2 animate-pulse rounded-full bg-gold" />بانتظار إجابة {oppName}…</div>
            </section>
          )}

          {!pending && myTurn && (
            <section className="glass space-y-4 p-4 animate-rise">
              <div>
                <label htmlFor="q" className="mb-1 block font-black">اكتب سؤالك عن اللاعب</label>
                <textarea id="q" className="input min-h-[84px] resize-none" maxLength={200} placeholder="مثال: هل لاعبك يلعب في ريال مدريد؟"
                  value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-white/40">{text.length}/200</span>
                  <button className="btn-primary" disabled={!text.trim() || busy} onClick={() => send(text)}>إرسال السؤال</button>
                </div>
              </div>
              <div>
                <div className="mb-2 font-black text-gold">أسئلة سريعة</div>
                <div className="space-y-2">
                  {QUICK_QUESTIONS.map((g) => (
                    <div key={g.title}>
                      <div className="mb-1 text-xs text-white/50">{g.title}</div>
                      <div className="flex flex-wrap gap-2">{g.items.map((it) => <button key={it} className="chip" disabled={busy} onClick={() => send(it)}>{it}</button>)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button className="btn-ghost w-full border-gold/50 text-gold" onClick={() => setGuessOpen(true)}>🎯 خمّن اللاعب السرّي</button>
            </section>
          )}

          {!pending && !myTurn && (
            <section className="glass grid place-items-center gap-2 p-6 text-center text-white/70">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/15 border-t-neon" />
              دور {oppName}… يمكنك مراجعة لوحة اللاعبين واستبعاد الاحتمالات أثناء الانتظار.
            </section>
          )}

          <section className="glass p-3">
            <div className="mb-2 font-black">سجل المباراة</div>
            <div ref={logRef} className="max-h-64 space-y-2 overflow-y-auto pr-1" aria-live="polite">
              {log.length === 0 && <div className="py-6 text-center text-sm text-white/40">لا توجد أسئلة بعد. ابدأ بسؤال ذكي!</div>}
              {log.map((it) => it.kind === "q" ? (
                <div key={it.q.id} className={cx("rounded-xl p-3 text-sm", it.q.asker === userId ? "bg-neon/10" : "bg-white/5")}>
                  <div className="text-xs text-white/50">{it.q.asker === userId ? "أنت" : nameOf(it.q.asker)} سأل:</div>
                  <div className="font-bold">{it.q.body}</div>
                  <div className={cx("mt-1 text-xs font-black", it.q.answer === null ? "text-gold" : it.q.answer ? "text-neon" : "text-red-300")}>
                    {it.q.answer === null ? "⏳ بانتظار الإجابة" : it.q.answer ? "الإجابة: نعم ✓" : "الإجابة: لا ✕"}
                  </div>
                </div>
              ) : (
                <div key={it.g.id} className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm">
                  🎯 {it.g.guesser === userId ? "أنت" : nameOf(it.g.guesser)} خمّن <b>{footballers.find((f) => f.id === it.g.footballer_id)?.name_ar}</b> — <span className="text-red-300">خطأ ✕</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-3">
          <section className="glass p-3 text-center">
            <div className="mb-2 flex items-center justify-between text-sm">
              <b>لاعبك السرّي</b>
              <button className="text-xs text-neon underline" onClick={() => setShowSecret((s) => !s)}>{showSecret ? "إخفاء" : "إظهار"}</button>
            </div>
            {showSecret && mine ? <div className="mx-auto w-40"><FootballerCard f={mine} /></div> : <div className="grid h-24 place-items-center text-4xl">🔒</div>}
          </section>
        </aside>
      </div>

      <section className="glass p-3">
        <div className="mb-2 flex items-center justify-between">
          <b>لوحة اللاعبين</b>
          <span className="text-xs text-white/50">المتبقي: {footballers.length - excluded.size} • اضغط لاستبعاد/إرجاع لاعب (خاص بك فقط)</span>
        </div>
        <PlayersGrid footballers={footballers} excluded={excluded} onSelect={toggleEx} />
      </section>

      {guessOpen && <GuessModal ctx={ctx} onClose={() => setGuessOpen(false)} />}
    </div>
  );
}
