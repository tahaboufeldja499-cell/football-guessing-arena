"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";
import type { Footballer, Guess, Question, Room, RoomPlayer, RoundRow } from "./types";

export type Conn = "connected" | "reconnecting";

export interface RoomState {
  room: Room | null; players: RoomPlayer[]; questions: Question[]; guesses: Guess[];
  rounds: RoundRow[]; myPick: number | null; footballers: Footballer[];
  conn: Conn; loading: boolean; gone: boolean;
}

/** يحمّل حالة الغرفة ويعيد تحميلها عند أي حدث لحظي (مزامنة بسيطة وموثوقة للاعبين اثنين). */
export function useRoom(roomId: string, userId: string) {
  const [s, setS] = useState<RoomState>({
    room: null, players: [], questions: [], guesses: [], rounds: [], myPick: null,
    footballers: [], conn: "reconnecting", loading: true, gone: false,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fbLoaded = useRef(false);

  const refetch = useCallback(async () => {
    const { data: room } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
    if (!room) { setS((p) => ({ ...p, gone: true, loading: false })); return; }
    const r = room as Room;
    const [pl, qs, gs, rs, pk, fb] = await Promise.all([
      supabase.from("room_players").select("*").eq("room_id", roomId).order("seat"),
      supabase.from("questions").select("*").eq("room_id", roomId).eq("round_no", r.current_round).order("created_at"),
      supabase.from("guesses").select("*").eq("room_id", roomId).eq("round_no", r.current_round).order("created_at"),
      supabase.from("rounds").select("*").eq("room_id", roomId).order("round_no"),
      supabase.from("secret_picks").select("footballer_id").eq("room_id", roomId).eq("round_no", r.current_round).eq("user_id", userId).maybeSingle(),
      fbLoaded.current ? Promise.resolve(null) : supabase.from("footballers").select("*").order("name_ar"),
    ]);
    if (fb && fb.data) fbLoaded.current = true;
    setS((p) => ({
      ...p, room: r, loading: false, gone: false,
      players: (pl.data ?? []) as RoomPlayer[], questions: (qs.data ?? []) as Question[],
      guesses: (gs.data ?? []) as Guess[], rounds: (rs.data ?? []) as RoundRow[],
      myPick: (pk.data as { footballer_id: number } | null)?.footballer_id ?? null,
      footballers: fb && fb.data ? (fb.data as Footballer[]) : p.footballers,
    }));
  }, [roomId, userId]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(refetch, 60);
  }, [refetch]);

  useEffect(() => {
    refetch();
    const ch = supabase.channel(`room:${roomId}`);
    for (const table of ["rooms", "room_players", "questions", "guesses", "rounds"]) {
      ch.on("postgres_changes",
        { event: "*", schema: "public", table, filter: table === "rooms" ? `id=eq.${roomId}` : `room_id=eq.${roomId}` },
        schedule);
    }
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") { setS((p) => ({ ...p, conn: "connected" })); refetch(); }
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED")
        setS((p) => ({ ...p, conn: "reconnecting" }));
    });
    const beat = () => { supabase.rpc("heartbeat", { p_room: roomId }).then(() => undefined, () => undefined); };
    const hb = setInterval(beat, 10000);
    beat();
    const onVis = () => { if (document.visibilityState === "visible") refetch(); };
    const onOnline = () => refetch();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(hb); if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      supabase.removeChannel(ch);
    };
  }, [roomId, refetch, schedule]);

  const me = useMemo(() => s.players.find((p) => p.user_id === userId) ?? null, [s.players, userId]);
  const opp = useMemo(() => s.players.find((p) => p.user_id !== userId) ?? null, [s.players, userId]);
  return { ...s, me, opp, refetch };
}

export const isOnline = (p: RoomPlayer | null) => !!p && Date.now() - new Date(p.last_seen).getTime() < 25000;
