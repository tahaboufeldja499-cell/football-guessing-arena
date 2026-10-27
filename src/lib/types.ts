export type Status = "lobby" | "picking" | "playing" | "round_end" | "finished";

export interface Footballer {
  id: number; name_ar: string; name_en: string; nationality: string;
  club: string | null; league: string | null; position: "GK" | "DF" | "MF" | "FW";
  photo_url: string | null;
}
export interface Room {
  id: string; code: string; host: string; status: Status; total_rounds: number;
  current_round: number; round_base: number; turn_uid: string | null;
  pending_question: string | null; winner: string | null; end_reason: string | null;
  last_match: { scores: { nickname: string; score: number }[]; reason: string | null } | null;
}
export interface RoomPlayer {
  room_id: string; user_id: string; nickname: string; seat: 1 | 2;
  ready: boolean; picked: boolean; score: number; last_seen: string;
}
export interface Question {
  id: string; room_id: string; round_no: number; asker: string; body: string;
  answer: boolean | null; answered_at: string | null; created_at: string;
}
export interface Guess {
  id: string; room_id: string; round_no: number; guesser: string;
  footballer_id: number; correct: boolean; created_at: string;
}
export interface RoundRow {
  room_id: string; round_no: number; winner: string | null;
  secrets: Record<string, number>; ended_at: string;
}
