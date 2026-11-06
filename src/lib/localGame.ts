/** محرك اللعب المحلي (جهاز واحد). دالة نقية بلا أي اتصال بالخادم، ويمكن اختبارها مباشرة. */
export type P = 0 | 1;
export type Answer = "yes" | "no" | "unsure";

export interface LogItem {
  id: number; kind: "q" | "g"; by: P;
  text?: string; answer?: Answer | null;   // للأسئلة
  footballerId?: number;                    // للتخمينات الخاطئة
}

export interface LocalState {
  phase: "setup" | "cover" | "pick" | "turn" | "roundEnd" | "final";
  names: [string, string];
  totalRounds: number; round: number;       // الجولة الحالية 1..totalRounds
  scores: [number, number];
  pool: number[];                           // معرّفات اللاعبين المتاحين
  secrets: [number | null, number | null];  // لا يُعرض سرّ أي لاعب إلا لصاحبه أو عند الكشف
  who: P;                                   // في يد من الجهاز الآن
  turn: P;                                  // صاحب الدور
  cover: { for: P; after: "pick" | "turn" } | null;
  pending: { id: number; by: P } | null;    // سؤال ينتظر إجابة
  log: LogItem[];
  guessed: [number[], number[]];            // تخمينات خاطئة لكل لاعب في الجولة
  excluded: [number[], number[]];           // استبعاد خاص بكل لاعب
  roundWinner: P | null;
  seq: number;
}

export type Action =
  | { t: "START"; names: [string, string]; pool: number[]; rounds: number }
  | { t: "READY" }
  | { t: "PICK"; id: number }
  | { t: "ASK"; text: string }
  | { t: "ANSWER"; a: Answer }
  | { t: "GUESS"; id: number }
  | { t: "TOGGLE_EX"; id: number }
  | { t: "NEXT" }
  | { t: "REMATCH" }
  | { t: "RESET" };

export const initialState: LocalState = {
  phase: "setup", names: ["اللاعب 1", "اللاعب 2"], totalRounds: 3, round: 1, scores: [0, 0], pool: [],
  secrets: [null, null], who: 0, turn: 0, cover: null, pending: null, log: [], guessed: [[], []], excluded: [[], []],
  roundWinner: null, seq: 0,
};

const other = (p: P): P => (p === 0 ? 1 : 0);
const freshRound = (s: LocalState, round: number): LocalState => ({
  ...s, round, phase: "cover", cover: { for: 0, after: "pick" }, who: 0, secrets: [null, null], pending: null, log: [],
  guessed: [[], []], excluded: [[], []], roundWinner: null,
});

export const MIN_POOL = 8;
export const MAX_Q = 200;

export function reducer(s: LocalState, a: Action): LocalState {
  switch (a.t) {
    case "START": {
      if (a.pool.length < MIN_POOL) return s;
      const names: [string, string] = [a.names[0].trim() || "اللاعب 1", a.names[1].trim() || "اللاعب 2"];
      return freshRound({ ...initialState, names, pool: a.pool, totalRounds: a.rounds }, 1);
    }
    case "READY":
      if (s.phase !== "cover" || !s.cover) return s;
      return { ...s, phase: s.cover.after, who: s.cover.for, cover: null };

    case "PICK": {
      if (s.phase !== "pick" || !s.pool.includes(a.id) || s.secrets[s.who] !== null) return s;
      const secrets = [...s.secrets] as LocalState["secrets"];
      secrets[s.who] = a.id;
      if (s.who === 0) return { ...s, secrets, phase: "cover", cover: { for: 1, after: "pick" } };
      const starter: P = s.round % 2 === 1 ? 0 : 1;   // يتناوب من يبدأ الأسئلة كل جولة
      return { ...s, secrets, turn: starter, phase: "cover", cover: { for: starter, after: "turn" } };
    }

    case "ASK": {
      const text = a.text.replace(/[\u0000-\u001F\u007F]/g, "").trim();
      if (s.phase !== "turn" || s.turn !== s.who || s.pending || !text || text.length > MAX_Q) return s;
      const id = s.seq + 1;
      return {
        ...s, seq: id, pending: { id, by: s.who }, log: [...s.log, { id, kind: "q", by: s.who, text, answer: null }],
        phase: "cover", cover: { for: other(s.who), after: "turn" },
      };
    }

    case "ANSWER": {
      if (s.phase !== "turn" || !s.pending || s.pending.by === s.who) return s;
      const pid = s.pending.id;
      // تناوب صارم كما في الأونلاين: بعد الإجابة ينتقل الدور إلى المجيب (وهو ممسك بالجهاز)
      return { ...s, pending: null, turn: s.who, log: s.log.map((l) => (l.id === pid ? { ...l, answer: a.a } : l)) };
    }

    case "GUESS": {
      if (s.phase !== "turn" || s.turn !== s.who || s.pending || !s.pool.includes(a.id)) return s;
      if (s.guessed[s.who].includes(a.id)) return s;
      const target = s.secrets[other(s.who)];
      if (target === null) return s;
      if (a.id === target) {
        const scores = [...s.scores] as LocalState["scores"];
        scores[s.who] += 1;
        return { ...s, scores, roundWinner: s.who, phase: "roundEnd" };
      }
      const guessed = [[...s.guessed[0]], [...s.guessed[1]]] as LocalState["guessed"];
      guessed[s.who].push(a.id);
      const id = s.seq + 1;
      return {
        ...s, seq: id, guessed, turn: other(s.who), log: [...s.log, { id, kind: "g", by: s.who, footballerId: a.id }],
        phase: "cover", cover: { for: other(s.who), after: "turn" },
      };
    }

    case "TOGGLE_EX": {
      if (s.phase !== "turn") return s;
      const ex = [[...s.excluded[0]], [...s.excluded[1]]] as LocalState["excluded"];
      const arr = ex[s.who], i = arr.indexOf(a.id);
      if (i >= 0) arr.splice(i, 1); else arr.push(a.id);
      return { ...s, excluded: ex };
    }

    case "NEXT": {
      if (s.phase !== "roundEnd") return s;
      if (s.round >= s.totalRounds) return { ...s, phase: "final" };
      return freshRound(s, s.round + 1);
    }
    case "REMATCH":
      if (s.phase !== "final") return s;
      return freshRound({ ...s, scores: [0, 0] }, 1);
    case "RESET":
      return initialState;
    default:
      return s;
  }
}

/** الفائز بالمباراة (null = تعادل). */
export const matchWinner = (s: LocalState): P | null => (s.scores[0] === s.scores[1] ? null : s.scores[0] > s.scores[1] ? 0 : 1);
