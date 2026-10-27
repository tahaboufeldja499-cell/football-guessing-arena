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
export const roomLink = (code: string) =>
  typeof window === "undefined" ? `/room/${code}` : `${window.location.origin}/room/${code}`;
