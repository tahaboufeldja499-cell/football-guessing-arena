export const cx = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(" ");
export function hue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}
export function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "?";
  return w.length === 1 ? Array.from(w[0])[0] : Array.from(w[0])[0] + Array.from(w[w.length - 1])[0];
}
/** رابط الدعوة. في التطبيق origin يكون localhost، فنستعمل NEXT_PUBLIC_SITE_URL (رابط موقعك المنشور) إن وُجد. */
export const roomLink = (code: string) => {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || (typeof window === "undefined" ? "" : window.location.origin)).replace(/\/$/, "");
  return `${site}/room/?code=${code}`;
};
/** يستخرج رمز الغرفة من رمز مكتوب أو رابط دعوة ملصوق. */
export const extractRoomCode = (input: string) => {
  const t = input.trim();
  const m = t.match(/[?&]code=([A-Za-z0-9]+)/);
  return (m ? m[1] : t.split(/[\s/]+/).filter(Boolean).pop() ?? "").toUpperCase();
};
