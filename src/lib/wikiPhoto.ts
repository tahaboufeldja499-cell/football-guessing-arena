"use client";
import { useEffect, useState } from "react";

/**
 * يجلب صورة كل لاعب من ويكيبيديا (صورة المقال الرئيسية) في وقت التشغيل، ولا يقبل إلا الصور المستضافة على
 * ويكيميديا كومنز (رخص مفتوحة). أي لاعب بلا صورة مناسبة تظهر له الصورة الافتراضية.
 * الطلبات تُجمَّع (حتى 50 لاعبًا في طلب واحد) وتُحفظ في الجهاز 14 يومًا فلا تتكرر.
 */

/** مقالات ويكيبيديا التي لا يطابق عنوانها الاسم الإنجليزي. أضف هنا أي لاعب تظهر له صورة خاطئة أو لا تظهر. */
export const TITLE_OVERRIDES: Record<string, string> = {
  Rodri: "Rodri (footballer, born 1996)",
  "Raúl": "Raúl (footballer, born 1977)",
};

export interface WikiPhoto {
  /** رابط الصورة المصغّرة */
  u: string;
  /** اسم ملف الصورة على كومنز (لصفحة الحقوق) */
  f: string;
  /** عنوان مقال ويكيبيديا */
  t: string;
  at: number;
}
type Rec = WikiPhoto | { none: true; at: number };

const KEY = "fga-wiki-v1";
const DAY = 86_400_000;
const TTL_OK = 14 * DAY, TTL_NONE = 2 * DAY;
const API = "https://en.wikipedia.org/w/api.php";

const mem = new Map<string, Rec>();
const queued = new Set<string>();
const inflight = new Set<string>();
const failedThisSession = new Set<string>();
const listeners = new Set<() => void>();
let loaded = false, timer: ReturnType<typeof setTimeout> | null = null, saveTimer: ReturnType<typeof setTimeout> | null = null;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, Rec>;
    for (const [k, v] of Object.entries(obj)) mem.set(k, v);
  } catch { /* تجاهل */ }
}
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(mem))); } catch { /* تجاهل */ }
  }, 500);
}
const notify = () => listeners.forEach((l) => l());
const fresh = (r: Rec | undefined) => !!r && Date.now() - r.at < ("none" in r ? TTL_NONE : TTL_OK);
const isCommons = (u: string) => u.startsWith("https://upload.wikimedia.org/wikipedia/commons/");

interface ApiPage { title: string; thumbnail?: { source: string }; pageimage?: string; pageprops?: { disambiguation?: string } }
interface ApiReply { query?: { normalized?: { from: string; to: string }[]; redirects?: { from: string; to: string }[]; pages?: Record<string, ApiPage> } }

async function fetchBatch(names: string[]) {
  const titleOf = (n: string) => TITLE_OVERRIDES[n] ?? n;
  const url = `${API}?action=query&format=json&origin=*&redirects=1&prop=pageimages%7Cpageprops&piprop=thumbnail%7Cname&pithumbsize=360&pilimit=50&ppprop=disambiguation&titles=${encodeURIComponent(names.map(titleOf).join("|"))}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as ApiReply;
  const q = data.query ?? {};
  const norm = new Map((q.normalized ?? []).map((x) => [x.from, x.to] as const));
  const redir = new Map((q.redirects ?? []).map((x) => [x.from, x.to] as const));
  const byTitle = new Map(Object.values(q.pages ?? {}).map((p) => [p.title, p] as const));
  const now = Date.now();
  for (const n of names) {
    let t = titleOf(n);
    t = norm.get(t) ?? t;
    t = redir.get(t) ?? t;
    const p = byTitle.get(t);
    const src = p?.thumbnail?.source;
    if (p && src && isCommons(src) && !(p.pageprops && "disambiguation" in p.pageprops)) mem.set(n, { u: src, f: p.pageimage ?? "", t: p.title, at: now });
    else mem.set(n, { none: true, at: now });
  }
}

async function flush() {
  timer = null;
  const batch = Array.from(queued).slice(0, 50);
  batch.forEach((n) => { queued.delete(n); inflight.add(n); });
  if (batch.length) {
    try { await fetchBatch(batch); save(); notify(); }
    catch { batch.forEach((n) => failedThisSession.add(n)); }
    finally { batch.forEach((n) => inflight.delete(n)); }
  }
  if (queued.size && !timer) timer = setTimeout(flush, 150);
}

function request(name: string) {
  load();
  if (fresh(mem.get(name)) || queued.has(name) || inflight.has(name) || failedThisSession.has(name)) return;
  queued.add(name);
  if (!timer) timer = setTimeout(flush, 80);
}

function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

/** رابط صورة اللاعب من ويكيبيديا، أو null (لم تُجلب بعد / لا توجد صورة مناسبة). */
export function useWikiPhoto(nameEn: string, skip = false): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (skip) { setUrl(null); return; }
    load();
    const read = () => { const r = mem.get(nameEn); setUrl(r && "u" in r ? r.u : null); };
    read();
    const off = subscribe(read);
    request(nameEn);
    return off;
  }, [nameEn, skip]);
  return url;
}

/** كل الصور التي وُجدت لقائمة أسماء (لصفحة الحقوق). */
export function useWikiCredits(names: string[]): { name: string; photo: WikiPhoto }[] {
  const [rows, setRows] = useState<{ name: string; photo: WikiPhoto }[]>([]);
  const key = names.join("|");
  useEffect(() => {
    load();
    const read = () => {
      const out: { name: string; photo: WikiPhoto }[] = [];
      for (const n of names) { const r = mem.get(n); if (r && "u" in r) out.push({ name: n, photo: r }); }
      setRows(out);
    };
    read();
    const off = subscribe(read);
    names.forEach(request);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return rows;
}
