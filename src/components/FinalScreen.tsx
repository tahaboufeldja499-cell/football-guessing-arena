"use client";
import { useRouter } from "next/navigation";
import type { RoomCtx } from "@/lib/ctx";
import { RevealPair } from "./RoundEnd";
import { Confetti } from "./ui";

export default function FinalScreen({ ctx }: { ctx: RoomCtx }) {
  const { room, me, opp, userId, rpc, busy } = ctx;
  const router = useRouter();
  const draw = room.end_reason === "draw";
  const iWon = room.winner === userId;
  const forfeit = room.end_reason === "forfeit";
  const lm = room.last_match;

  async function leave() { await rpc("leave_room", { p_room: room.id }); router.push("/"); }

  return (
    <div className="mx-auto max-w-xl space-y-4 py-4 text-center">
      {iWon && <Confetti />}
      <h2 className={iWon ? "text-4xl font-black text-gold" : "text-4xl font-black"}>
        {draw ? "🤝 تعادل!" : iWon ? "🏆 أنت بطل المباراة!" : `فاز ${opp?.nickname ?? "خصمك"} بالمباراة`}
      </h2>
      {forfeit && <p className="text-white/70">{iWon ? "غادر خصمك أو انقطع اتصاله قبل نهاية المباراة، فحُسم الفوز لك." : "المباراة انتهت بالانسحاب."}</p>}
      <div className="glass flex items-center justify-around p-5 text-xl font-black">
        <div>{me.nickname}<div className="text-5xl text-neon">{me.score}</div></div>
        <div className="text-white/40">النتيجة النهائية</div>
        <div>{opp?.nickname ?? "—"}<div className="text-5xl">{opp?.score ?? 0}</div></div>
      </div>
      {!forfeit && <RevealPair ctx={ctx} />}
      {lm && (
        <div className="glass p-3 text-sm text-white/70">
          نتيجة المباراة السابقة: {lm.scores.map((s) => `${s.nickname} ${s.score}`).join(" — ")}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary flex-1" disabled={!opp || busy} onClick={() => rpc("rematch", { p_room: room.id })}>إعادة المباراة</button>
        <button className="btn-ghost" onClick={leave}>مغادرة الغرفة</button>
      </div>
      {!opp && <p className="text-sm text-white/50">غادر خصمك الغرفة، ولا يمكن إعادة المباراة.</p>}
    </div>
  );
}
