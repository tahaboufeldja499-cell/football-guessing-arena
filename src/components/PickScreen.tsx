"use client";
import { useState } from "react";
import type { RoomCtx } from "@/lib/ctx";
import { FootballerCard, PlayersGrid } from "./FootballerCard";

export default function PickScreen({ ctx }: { ctx: RoomCtx }) {
  const { room, me, opp, myPick, footballers, rpc, busy, roundNo } = ctx;
  const [sel, setSel] = useState<number | null>(null);
  const chosen = footballers.find((f) => f.id === (myPick ?? sel));
  const mine = footballers.find((f) => f.id === myPick);

  if (myPick && mine) {
    return (
      <div className="mx-auto grid max-w-sm place-items-center gap-4 py-8 text-center">
        <div className="text-sm text-white/60">الجولة {roundNo} من {room.total_rounds}</div>
        <h2 className="text-2xl font-black">تم تثبيت اختيارك 🔒</h2>
        <FootballerCard f={mine} big />
        <div className="glass px-4 py-3 text-white/80">
          {opp?.picked ? "اكتمل الاختيار… جارٍ بدء الجولة" : `ننتظر ${opp?.nickname ?? "خصمك"} ليختار لاعبه السرّي…`}
        </div>
        <p className="text-xs text-white/45">اختيارك لا يظهر لخصمك أبدًا قبل نهاية الجولة.</p>
      </div>
    );
  }
  return (
    <div className="pb-28">
      <div className="mb-4 text-center">
        <div className="text-sm text-white/60">الجولة {roundNo} من {room.total_rounds}</div>
        <h2 className="text-2xl font-black">اختر لاعبك السرّي</h2>
        <p className="text-sm text-white/60">خصمك سيحاول اكتشافه بأسئلته. اختر بحكمة، فلا يمكن تغييره بعد التأكيد.</p>
        <p className="mt-1 text-xs text-white/40">{me.picked ? "" : opp?.picked ? `${opp.nickname} اختار بالفعل` : ""}</p>
      </div>
      <PlayersGrid footballers={footballers} selectedId={sel} onSelect={setSel} />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink/90 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1 truncate text-sm">{chosen ? <>اللاعب: <b className="text-neon">{chosen.name_ar}</b></> : "اضغط على بطاقة لاعب"}</div>
          <button className="btn-primary" disabled={!sel || busy} onClick={() => sel && rpc("pick_secret", { p_room: room.id, p_footballer: sel })}>تأكيد الاختيار</button>
        </div>
      </div>
    </div>
  );
}
