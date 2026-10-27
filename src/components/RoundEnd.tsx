"use client";
import { useEffect, useState } from "react";
import { ASSETS } from "@/lib/assets";
import type { RoomCtx } from "@/lib/ctx";
import { sfx } from "@/lib/sounds";
import type { Footballer } from "@/lib/types";
import { cx } from "@/lib/utils";
import { FootballerCard } from "./FootballerCard";
import Icon from "./Icon";
import { Confetti } from "./ui";

/** بطاقة مخفية تنقلب لتكشف اللاعب الحقيقي (قلب ثلاثي الأبعاد بإضاءة ذهبية). */
export function FlipCard({ f, label, delay }: { f?: Footballer; label: string; delay: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => { setOn(true); sfx.reveal(); }, delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div className="text-center">
      <div className="mb-1 text-sm text-white/75">{label}</div>
      <div className={cx("flip mx-auto w-full max-w-[230px]", on && "on")}>
        <div className="flip-inner">
          <div className="flip-face">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="mystery-img" src={ASSETS.mystery} alt="بطاقة مخفية" />
          </div>
          <div className="flip-face flip-back">{f ? <FootballerCard f={f} big reveal={on} /> : <div className="glass h-full" />}</div>
        </div>
      </div>
    </div>
  );
}

export function RevealPair({ ctx }: { ctx: RoomCtx }) {
  const round = ctx.rounds.find((r) => r.round_no === ctx.room.current_round);
  if (!round) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      {ctx.players.map((p, i) => (
        <FlipCard key={p.user_id} f={ctx.footballers.find((x) => x.id === round.secrets[p.user_id])}
          label={`لاعب ${p.user_id === ctx.userId ? "أنت" : p.nickname} السرّي`} delay={500 + i * 450} />
      ))}
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
      <div className="text-sm text-white/70">انتهت الجولة {roundNo} من {room.total_rounds}</div>
      <h2 className={cx("flex items-center justify-center gap-2 text-3xl font-black [text-shadow:0_2px_14px_rgba(0,0,0,.85)]", iWon && "text-gold")}>
        {iWon && <Icon name="trophy" size={32} />}
        {iWon ? "فزت بالجولة!" : `فاز ${opp?.nickname ?? "خصمك"} بالجولة`}
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
