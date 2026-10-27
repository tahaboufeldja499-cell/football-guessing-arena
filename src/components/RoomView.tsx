"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Rpc, RoomCtx } from "@/lib/ctx";
import { arabicError } from "@/lib/errors";
import { isMuted, setMuted, sfx } from "@/lib/sounds";
import { supabase } from "@/lib/supabase";
import { isOnline, useRoom } from "@/lib/useRoom";
import FinalScreen from "./FinalScreen";
import Lobby from "./Lobby";
import MatchScreen from "./MatchScreen";
import PickScreen from "./PickScreen";
import RoundEnd from "./RoundEnd";
import { ConnBanner, Logo, Spinner, Toast } from "./ui";

export default function RoomView({ roomId, userId }: { roomId: string; userId: string }) {
  const st = useRoom(roomId, userId);
  const router = useRouter();
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [muted, setMutedState] = useState(false);
  const refetchRef = useRef(st.refetch);
  refetchRef.current = st.refetch;

  useEffect(() => { setMutedState(isMuted()); }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);

  const info = useCallback((text: string, kind: "ok" | "err" = "ok") => {
    setToast({ text, kind });
    setTimeout(() => setToast((t) => (t && t.text === text ? null : t)), 3500);
  }, []);

  const rpc: Rpc = useCallback(async <T,>(fn: string, args?: Record<string, unknown>) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc(fn, args);
      if (error) { info(arabicError(error), "err"); refetchRef.current(); return { ok: false, data: null as T | null }; }
      refetchRef.current();
      return { ok: true, data: (data ?? null) as T | null };
    } catch (e) {
      info(arabicError(e), "err");
      return { ok: false, data: null as T | null };
    } finally { setBusy(false); }
  }, [info]);

  // ---- إشعارات وأصوات عند الأحداث الجديدة (دون تكرار عند أول تحميل) ----
  const primed = useRef(false);
  const seenIncoming = useRef<string | null>(null);
  const seenAnswered = useRef<Set<string>>(new Set());
  const prevStatus = useRef<string | null>(null);
  const { room, questions, rounds } = st;
  useEffect(() => {
    if (!room) return;
    const pending = questions.find((q) => q.id === room.pending_question);
    if (!primed.current) {
      primed.current = true;
      seenIncoming.current = pending && pending.asker !== userId ? pending.id : null;
      questions.forEach((q) => { if (q.answer !== null) seenAnswered.current.add(q.id); });
      prevStatus.current = room.status;
      return;
    }
    if (pending && pending.asker !== userId && seenIncoming.current !== pending.id) {
      seenIncoming.current = pending.id;
      sfx.incoming(); navigator.vibrate?.(120);
    }
    for (const q of questions) {
      if (q.asker === userId && q.answer !== null && !seenAnswered.current.has(q.id)) {
        seenAnswered.current.add(q.id); sfx.answered();
        info(`إجابة خصمك: ${q.answer ? "نعم ✓" : "لا ✕"}`);
      }
    }
    if (prevStatus.current !== room.status) {
      if (room.status === "round_end") {
        const r = rounds.find((x) => x.round_no === room.current_round);
        (r?.winner === userId ? sfx.win : sfx.lose)();
      } else if (room.status === "finished" && room.end_reason !== "draw") {
        (room.winner === userId ? sfx.win : sfx.lose)();
      }
      prevStatus.current = room.status;
    }
  }, [room, questions, rounds, userId, info]);

  if (st.loading) return <Spinner label="جارٍ دخول الغرفة..." />;
  if (st.gone || !st.room) {
    return (
      <div className="glass mx-auto mt-16 max-w-md p-8 text-center">
        <div className="mb-4 text-xl font-black">لم تعد هذه الغرفة موجودة</div>
        <button className="btn-primary" onClick={() => router.push("/")}>العودة للرئيسية</button>
      </div>
    );
  }
  if (!st.me) {
    return (
      <div className="glass mx-auto mt-16 max-w-md p-8 text-center">
        <div className="mb-4 text-xl font-black">أنت لست عضوًا في هذه الغرفة</div>
        <button className="btn-primary" onClick={() => router.push("/")}>العودة للرئيسية</button>
      </div>
    );
  }

  const ctx: RoomCtx = {
    roomId, userId, room: st.room, me: st.me, opp: st.opp, players: st.players, questions: st.questions,
    guesses: st.guesses, rounds: st.rounds, myPick: st.myPick, footballers: st.footballers, rpc, info, busy,
    roundNo: st.room.current_round - st.room.round_base,
  };
  const oppGone = !!st.opp && now - new Date(st.opp.last_seen).getTime() > 60000;
  const canClaim = oppGone && ["picking", "playing", "round_end"].includes(st.room.status);
  const oppOnlineNow = isOnline(st.opp);

  return (
    <div className="mx-auto max-w-5xl px-3 pb-10 pt-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Logo small />
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs tracking-widest" dir="ltr">{st.room.code}</span>
          <button className="btn-ghost px-3 py-1.5" aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
            onClick={() => { setMuted(!muted); setMutedState(!muted); }}>{muted ? "🔇" : "🔊"}</button>
          {st.room.status !== "lobby" && st.room.status !== "finished" && (
            <button className="btn-ghost px-3 py-1.5 text-red-300" onClick={async () => {
              if (!confirm("مغادرة المباراة تعني خسارتها. هل أنت متأكد؟")) return;
              await rpc("leave_room", { p_room: roomId }); router.push("/");
            }}>انسحاب</button>
          )}
        </div>
      </div>
      <ConnBanner conn={st.conn} />
      {canClaim && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
          <span>{st.opp?.nickname} غائب منذ أكثر من دقيقة.</span>
          <button className="btn-primary px-4 py-2" disabled={busy} onClick={() => rpc("claim_forfeit", { p_room: roomId })}>أعلن فوزك بالانسحاب</button>
        </div>
      )}
      {st.room.status === "playing" && st.opp && !oppOnlineNow && !canClaim && (
        <div className="mb-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-center text-sm text-white/70">انقطع اتصال {st.opp.nickname} مؤقتًا… ننتظر عودته.</div>
      )}
      {st.room.status === "lobby" && <Lobby ctx={ctx} />}
      {st.room.status === "picking" && <PickScreen ctx={ctx} />}
      {st.room.status === "playing" && <MatchScreen ctx={ctx} />}
      {st.room.status === "round_end" && <RoundEnd ctx={ctx} />}
      {st.room.status === "finished" && <FinalScreen ctx={ctx} />}
      {toast && <Toast text={toast.text} kind={toast.kind} />}
    </div>
  );
}
