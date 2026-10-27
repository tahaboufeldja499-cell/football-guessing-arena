"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RoomView from "@/components/RoomView";
import { Logo, Spinner } from "@/components/ui";
import SetupNotice from "@/components/SetupNotice";
import { arabicError } from "@/lib/errors";
import { ensureUser, isConfigured, supabase } from "@/lib/supabase";

interface Peek { exists: boolean; is_member?: boolean; players?: number; status?: string; host_nickname?: string; room_id?: string | null }

export default function RoomPage() {
  const { code: raw } = useParams<{ code: string }>();
  const code = String(raw ?? "").toUpperCase();
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [peek, setPeek] = useState<Peek | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [nick, setNick] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isConfigured) return;
    try { setNick(localStorage.getItem("fga-nick") ?? ""); } catch { /* ignore */ }
    (async () => {
      try {
        const u = await ensureUser(); setUid(u.id);
        const { data, error } = await supabase.rpc("peek_room", { p_code: code });
        if (error) throw error;
        const p = data as Peek; setPeek(p);
        if (p.is_member && p.room_id) setRoomId(p.room_id);
      } catch (e) { setErr(arabicError(e)); }
    })();
  }, [code]);

  async function join() {
    setErr("");
    if (nick.trim().length < 2) { setErr("اكتب اسمًا مستعارًا من حرفين على الأقل."); return; }
    setBusy(true);
    try {
      try { localStorage.setItem("fga-nick", nick.trim()); } catch { /* ignore */ }
      const { data, error } = await supabase.rpc("join_room", { p_code: code, p_nickname: nick.trim() });
      if (error) throw error;
      setRoomId(data as string);
    } catch (e) { setErr(arabicError(e)); } finally { setBusy(false); }
  }

  if (!isConfigured) return <SetupNotice />;
  if (roomId && uid) return <RoomView roomId={roomId} userId={uid} />;
  if (!peek && !err) return <Spinner />;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="mb-8 flex justify-center"><Logo /></div>
      <div className="glass space-y-4 p-6 text-center animate-rise">
        {peek && !peek.exists ? (
          <>
            <div className="text-xl font-black">الغرفة غير موجودة</div>
            <p className="text-white/60">تأكد من الرمز <b dir="ltr">{code}</b> أو اطلب رابطًا جديدًا.</p>
            <button className="btn-primary" onClick={() => router.push("/")}>العودة للرئيسية</button>
          </>
        ) : peek && (peek.players ?? 0) >= 2 ? (
          <>
            <div className="text-xl font-black">الغرفة ممتلئة</div>
            <p className="text-white/60">هذه الغرفة مخصصة للاعبين اثنين وقد اكتمل عددها.</p>
            <button className="btn-primary" onClick={() => router.push("/")}>إنشاء غرفة خاصة بك</button>
          </>
        ) : (
          <>
            <div className="text-xl font-black">دعوة للعب{peek?.host_nickname ? ` من ${peek.host_nickname}` : ""}</div>
            <p className="text-sm text-white/60">رمز الغرفة <b className="text-neon" dir="ltr">{code}</b></p>
            <input className="input text-center" placeholder="اسمك المستعار" maxLength={20} value={nick}
              onChange={(e) => setNick(e.target.value)} onKeyDown={(e) => e.key === "Enter" && join()} />
            <button className="btn-primary w-full" disabled={busy} onClick={join}>انضمام إلى الغرفة</button>
          </>
        )}
        {err && <p role="alert" className="text-sm font-bold text-red-300">{err}</p>}
      </div>
    </main>
  );
}
