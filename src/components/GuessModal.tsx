"use client";
import { useMemo, useState } from "react";
import type { RoomCtx } from "@/lib/ctx";
import { sfx } from "@/lib/sounds";
import { PlayersGrid } from "./FootballerCard";

export default function GuessModal({ ctx, onClose }: { ctx: RoomCtx; onClose: () => void }) {
  const { room, userId, guesses, footballers, rpc, info, busy, opp } = ctx;
  const [sel, setSel] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const used = useMemo(() => new Set(guesses.filter((g) => g.guesser === userId).map((g) => g.footballer_id)), [guesses, userId]);
  const f = footballers.find((x) => x.id === sel);

  async function submit() {
    if (!sel) return;
    const r = await rpc<boolean>("make_guess", { p_room: room.id, p_footballer: sel });
    if (!r.ok) { setConfirming(false); return; }
    if (r.data === false) { sfx.wrong(); info("تخمين خاطئ ✕ — انتقل الدور إلى خصمك", "err"); }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="تخمين اللاعب السرّي">
      <div className="glass flex max-h-[92vh] w-full max-w-3xl flex-col rounded-b-none bg-ink/95 p-4 animate-rise sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xl font-black">من هو لاعب {opp?.nickname ?? "خصمك"} السرّي؟</h3>
          <button className="btn-ghost px-3 py-1" onClick={onClose} aria-label="إغلاق">✕</button>
        </div>
        {confirming && f ? (
          <div className="grid place-items-center gap-4 py-8 text-center">
            <div className="text-lg">هل أنت متأكد أن لاعب خصمك هو <b className="text-neon">{f.name_ar}</b>؟</div>
            <div className="text-sm text-white/60">إن أخطأت يُفقدك ذلك دورك.</div>
            <div className="flex gap-2">
              <button className="btn-primary" disabled={busy} onClick={submit}>نعم، أؤكد التخمين</button>
              <button className="btn-ghost" onClick={() => setConfirming(false)}>رجوع</button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto pb-2"><PlayersGrid footballers={footballers} selectedId={sel} disabledIds={used} onSelect={setSel} /></div>
            <div className="mt-3 flex items-center gap-3 border-t border-white/10 pt-3">
              <div className="min-w-0 flex-1 truncate text-sm">{f ? <>اخترت: <b className="text-neon">{f.name_ar}</b></> : "اختر لاعبًا لتخمينه"}</div>
              <button className="btn-primary" disabled={!sel} onClick={() => setConfirming(true)}>متابعة</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
