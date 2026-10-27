"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RoomCtx } from "@/lib/ctx";
import { sfx } from "@/lib/sounds";
import { isOnline } from "@/lib/useRoom";
import { roomLink } from "@/lib/utils";
import { PlayerAvatar, StatusDot } from "./ui";

function Slot({ nick, you, online, ready, empty }: { nick?: string; you?: boolean; online?: boolean; ready?: boolean; empty?: boolean }) {
  if (empty) return (
    <div className="glass grid min-h-[120px] place-items-center border-dashed p-4 text-center text-white/50">
      <div><div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-white/15 border-t-neon" />بانتظار اللاعب الثاني…</div>
    </div>
  );
  const label = !online ? "انقطع اتصاله" : ready ? "جاهز ✓" : "يستعد";
  return (
    <div className="glass flex min-h-[120px] items-center gap-3 p-4 animate-pop">
      <PlayerAvatar size={64} />
      <div>
        <div className="text-lg font-black">{nick}{you && <span className="mr-2 text-xs text-neon">(أنت)</span>}</div>
        <div className="flex items-center gap-2 text-sm text-white/70"><StatusDot online={!!online} />{label}</div>
      </div>
    </div>
  );
}

export default function Lobby({ ctx }: { ctx: RoomCtx }) {
  const { room, me, opp, rpc, info, busy } = ctx;
  const router = useRouter();
  const link = roomLink(room.code);

  // أصوات اللاعب الآخر فقط: انضمامه واستعداده (لا صوت عند فتح الصفحة وهو موجود أصلًا)
  const prevOpp = useRef<string | null>(opp ? opp.user_id : null);
  const prevReady = useRef<boolean>(opp ? opp.ready : false);
  useEffect(() => {
    const id = opp ? opp.user_id : null;
    if (id && id !== prevOpp.current) sfx.joined();
    else if (id && opp && opp.ready && !prevReady.current) sfx.ready();
    prevOpp.current = id; prevReady.current = opp ? opp.ready : false;
  }, [opp]);

  async function copy(text: string, msg: string) {
    try { await navigator.clipboard.writeText(text); sfx.copied(); info(msg); } catch { info("تعذّر النسخ تلقائيًا، انسخه يدويًا.", "err"); }
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: "ساحة تخمين النجوم", text: "تعال نلعب تحدي تخمين اللاعبين!", url: link }); return; } catch { /* ألغى */ } }
    copy(link, "تم نسخ رابط الدعوة");
  }
  async function leave() { await rpc("leave_room", { p_room: room.id }); router.push("/"); }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="glass p-5 text-center animate-rise">
        <div className="text-sm text-white/60">رمز الغرفة</div>
        <div className="my-2 text-5xl font-black tracking-[.3em] text-neon" dir="ltr">{room.code}</div>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn-ghost" onClick={() => copy(room.code, "تم نسخ الرمز")}>نسخ الرمز</button>
          <button className="btn-primary" onClick={share}>مشاركة رابط الدعوة</button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Slot nick={me.nickname} you online ready={me.ready} />
        {opp ? <Slot nick={opp.nickname} online={isOnline(opp)} ready={opp.ready} /> : <Slot empty />}
      </section>

      <section className="glass space-y-1 p-4 text-sm text-white/75">
        <div className="mb-1 font-black text-gold">قواعد المباراة</div>
        <div>• {room.total_rounds} جولات، ولكل جولة فائز يربح نقطة.</div>
        <div>• كلٌّ يختار لاعبًا سريًّا، ثم تتناوبان الأسئلة. خصمك يجيب بنفسه بنعم أو لا، ولا تُعدَّل الإجابة بعد اعتمادها.</div>
        <div>• في دورك: اسأل سؤالًا واحدًا أو خمّن. التخمين الصحيح يربح الجولة، والخاطئ يُفقدك الدور. لا يمكن تكرار التخمين نفسه.</div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary flex-1" disabled={!opp || busy} onClick={() => rpc("set_ready", { p_room: room.id, p_ready: !me.ready })}>
          {me.ready ? "إلغاء الاستعداد" : "أنا جاهز"}
        </button>
        <button className="btn-ghost" onClick={leave}>مغادرة الغرفة</button>
      </div>
      {!opp && <p className="text-center text-sm text-white/50">ترسل الرمز أو الرابط لصديقك، وتبدأ المباراة عندما يؤكد الطرفان الاستعداد.</p>}
    </div>
  );
}
