import type { Footballer, Guess, Question, Room, RoomPlayer, RoundRow } from "./types";

export type Rpc = <T = unknown>(fn: string, args?: Record<string, unknown>) => Promise<{ ok: boolean; data: T | null }>;

/** كل ما تحتاجه شاشات الغرفة، يمرّره RoomView مرة واحدة. */
export interface RoomCtx {
  roomId: string; userId: string; room: Room; me: RoomPlayer; opp: RoomPlayer | null;
  players: RoomPlayer[]; questions: Question[]; guesses: Guess[]; rounds: RoundRow[];
  myPick: number | null; footballers: Footballer[];
  rpc: Rpc; info: (text: string, kind?: "ok" | "err") => void; busy: boolean; roundNo: number;
}
