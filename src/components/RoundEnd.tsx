"use client";
import type { RoomCtx } from "@/lib/ctx";
import { FootballerCard } from "./FootballerCard";
import { Confetti } from "./ui";

export function RevealPair({ ctx }: { ctx: RoomCtx }) {
  const round = ctx.rounds.find((r) => r.round_no === ctx.room.current_round);
  if (!round) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      {ctx.players.map((p) => {
        const f = ctx.footballers.find((x) => x.id === round.secrets[p.user_id]);
        return (
          <div key={p.user_id} className="text-center">
            <div className="mb-1 text-sm text-white/60">لاعب {p.user_id === ctx.userId ? "أنت" : p.nickname} السرّي</div>
            {f ? <FootballerCard f={f} big /> : <div className="glass p-6 text-white/40">—</div>}
          </div>
        );
      })}
    </div>
  );
}

export default function RoundEnd({ ctx }: { ctx: RoomCtx }) {
  const { room, rounds, userId, me, opp, rpc, busy, roundNo } = ctx;
  const round = rounds.find((r) => r.round_no === room.current_round);
  const iWon = round?.winner === userId;
  return (
    <div className="mx-auto max-w-xl space-y-4 py-4 text-center">
      {iWon && <Confetti />}
      <div className="text-sm text-white/60">انتهت الجولة {roundNo} من {room.total_rounds}</div>
      <h2 className={iWon ? "text-3xl font-black text-gold" : "text-3xl font-black"}>
        {iWon ? "🏆 فزت بالجولة!" : `فاز ${opp?.nickname ?? "خصمك"} بالجولة`}
      </h2>
      <RevealPair ctx={ctx} />
      <div className="glass flex items-center justify-around p-4 text-xl font-black">
        <div>{me.nickname}<div className="text-4xl text-neon">{me.score}</div></div>
        <div className="text-white/40">—</div>
        <div>{opp?.nickname}<div className="text-4xl">{opp?.score ?? 0}</div></div>
      </div>
      <button className="btn-primary w-full" disabled={busy} onClick={() => rpc("next_round", { p_room: room.id })}>الجولة التالية</button>
    </div>
  );
}
