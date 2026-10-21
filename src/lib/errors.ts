const MAP: Record<string, string> = {
  NOT_AUTHENTICATED: "تعذّر تسجيل دخولك كضيف. أعد تحميل الصفحة.",
  BAD_NICKNAME: "الاسم يجب أن يكون بين حرفين و20 حرفًا.",
  ROOM_NOT_FOUND: "هذه الغرفة غير موجودة. تأكد من الرمز.",
  ROOM_FULL: "الغرفة ممتلئة: مخصصة للاعبين اثنين فقط.",
  MATCH_ALREADY_STARTED: "بدأت المباراة في هذه الغرفة ولا يمكن الانضمام الآن.",
  NOT_IN_ROOM: "أنت لست عضوًا في هذه الغرفة.",
  BAD_STATE: "هذا الإجراء غير متاح في المرحلة الحالية.",
  BAD_FOOTBALLER: "اللاعب المختار غير صالح.",
  ALREADY_PICKED: "اخترت بطاقتك السرية بالفعل ولا يمكن تغييرها.",
  BAD_QUESTION: "اكتب سؤالًا بين حرف و200 حرف.",
  NOT_YOUR_TURN: "ليس دورك الآن.",
  QUESTION_PENDING: "هناك سؤال ينتظر الإجابة، انتظر خصمك.",
  TOO_FAST: "مهلًا، أرسلت بسرعة كبيرة. حاول بعد لحظة.",
  NO_SUCH_PENDING_QUESTION: "هذا السؤال لم يعد بانتظار الإجابة.",
  CANNOT_ANSWER_OWN_QUESTION: "لا يمكنك الإجابة عن سؤالك.",
  ALREADY_ANSWERED: "تمت الإجابة عن هذا السؤال بالفعل.",
  DUPLICATE_GUESS: "خمّنت هذا اللاعب من قبل في هذه الجولة.",
  OPPONENT_LEFT: "غادر خصمك الغرفة.",
};

export function arabicError(e: unknown): string {
  const msg = typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  for (const k of Object.keys(MAP)) if (msg.includes(k)) return MAP[k];
  if (/Failed to fetch|NetworkError/i.test(msg)) return "تعذّر الاتصال بالخادم. تحقق من الإنترنت.";
  return "حدث خطأ غير متوقع. حاول مرة أخرى.";
}
