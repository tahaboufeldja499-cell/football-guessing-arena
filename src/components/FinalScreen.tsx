"use client";
import { useRouter } from "next/navigation";
import { ASSETS } from "@/lib/assets";
import type { RoomCtx } from "@/lib/ctx";
import { cx } from "@/lib/utils";
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ASSETS.trophy} alt="كأس البطولة" width={240} height={320}
        className={cx("trophy-img", iWon ? "h-64 w-auto sm:h-72" : "h-44 w-auto opacity-70 grayscale-[.5]")} />
      <h2 className={cx("text-4xl font-black [text-shadow:0_2px_16px_rgba(0,0,0,.9)]", iWon && "text-gold")}>
        {draw ? "تعادل!" : iWon ? "أنت بطل المباراة!" : `فاز ${opp?.nickname ?? "خصمك"} بالمباراة`}
      </h2>
      {forfeit && <p className="text-white/80">{iWon ? "غادر خصمك أو انقطع اتصاله قبل نهاية المباراة، فحُسم الفوز لك." : "المباراة انتهت بالانسحاب."}</p>}
      <div className="glass flex items-center justify-around p-5 text-xl font-black">
        <div>{me.nickname}<div className="text-5xl text-neon">{me.score}</div></div>
        <div className="text-white/50">النتيجة النهائية</div>
        <div>{opp?.nickname ?? "—"}<div className="text-5xl">{opp?.score ?? 0}</div></div>
      </div>
      {!forfeit && <RevealPair ctx={ctx} />}
      {lm && (
        <div className="glass p-3 text-sm text-white/75">
          نتيجة المباراة السابقة: {lm.scores.map((s) => `${s.nickname} ${s.score}`).join(" — ")}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary flex-1" disabled={!opp || busy} onClick={() => rpc("rematch", { p_room: room.id })}>إعادة المباراة</button>
        <button className="btn-ghost" onClick={leave}>مغادرة الغرفة</button>
      </div>
      {!opp && <p className="text-sm text-white/60">غادر خصمك الغرفة، ولا يمكن إعادة المباراة.</p>}
    </div>
  );
}
