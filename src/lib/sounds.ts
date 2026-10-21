import { playIntro, playSfx, scheduleBar, type Mood, type SfxName } from "./audio/synth";

/** مدير الصوت: موسيقى + مؤثرات بإعدادات مستقلة. لا يبدأ أي صوت قبل أول تفاعل من المستخدم (سياسة المتصفح). */
const K = { music: "fga-music", sfx: "fga-sfx", mvol: "fga-music-vol", svol: "fga-sfx-vol", legacy: "fga-muted" };
const rd = (k: string, d: string) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } };
const wr = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export const isMusicOn = () => rd(K.music, "1") === "1";
export const isSfxOn = () => rd(K.sfx, rd(K.legacy, "0") === "1" ? "0" : "1") === "1";
export const getMusicVol = () => Math.min(1, Math.max(0, Number(rd(K.mvol, "0.6"))));
export const getSfxVol = () => Math.min(1, Math.max(0, Number(rd(K.svol, "0.8"))));
/** توافق مع الاستدعاءات القديمة: «كتم» = إيقاف المؤثرات والموسيقى معًا. */
export const isMuted = () => !isMusicOn() && !isSfxOn();

let ctx: AudioContext | null = null;
let musicOut: GainNode, sfxOut: GainNode;
let unlocked = false, wantMood: Mood | null = null, introUntil = 0, token = 0;
let synth: { bus: GainNode; mood: Mood; bar: number; next: number; timer: number } | null = null;
let introBus: GainNode | null = null;
let fileEl: HTMLAudioElement | null = null;
const fileOk = new Map<Mood, boolean>();

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    musicOut = ctx.createGain(); sfxOut = ctx.createGain();
    musicOut.connect(comp); sfxOut.connect(comp);
    applyVol();
  }
  return ctx;
}
function applyVol() {
  if (!ctx) return;
  musicOut.gain.value = isMusicOn() ? getMusicVol() * 0.45 : 0;   // الموسيقى أخفض من المؤثرات لتبقى المؤثرات واضحة
  sfxOut.gain.value = isSfxOn() ? getSfxVol() : 0;
  if (fileEl) fileEl.volume = isMusicOn() ? getMusicVol() : 0;
}

async function hasFile(m: Mood) {
  if (fileOk.has(m)) return fileOk.get(m)!;
  try {
    const r = await fetch(`/audio/music-${m}.mp3`, { method: "HEAD" });
    const ok = r.ok && (r.headers.get("content-type") || "").includes("audio");
    fileOk.set(m, ok); return ok;
  } catch { fileOk.set(m, false); return false; }
}

function startSynth(m: Mood) {
  if (!ctx) return;
  if (synth) { synth.mood = m; return; }
  const bus = ctx.createGain(), now = ctx.currentTime;
  bus.gain.setValueAtTime(0.0001, now); bus.gain.linearRampToValueAtTime(1, now + 1.5); bus.connect(musicOut);
  const st = { bus, mood: m, bar: 0, next: now + 0.1, timer: 0 };
  const tick = () => { while (ctx && st.next < ctx.currentTime + 1.5) { st.next += scheduleBar(ctx, bus, st.next, st.bar, st.mood); st.bar++; } };
  tick(); st.timer = window.setInterval(tick, 400); synth = st;
}
function stopSynth() {
  if (!synth || !ctx) return;
  const s = synth; synth = null; window.clearInterval(s.timer);
  const t = ctx.currentTime; s.bus.gain.cancelScheduledValues(t); s.bus.gain.setValueAtTime(Math.max(0.0001, s.bus.gain.value), t); s.bus.gain.linearRampToValueAtTime(0.0001, t + 0.5);
  window.setTimeout(() => s.bus.disconnect(), 900);
}
function stopFile() { if (fileEl) { fileEl.pause(); fileEl = null; } }

async function syncMusic() {
  if (!unlocked || !ctx) return;
  const my = ++token;
  if (performance.now() < introUntil) { window.setTimeout(syncMusic, introUntil - performance.now() + 50); return; }
  if (!isMusicOn() || !wantMood) { stopSynth(); stopFile(); return; }
  const m = wantMood;
  const file = await hasFile(m);
  if (my !== token) return;
  if (file) {            // ملف موسيقى حقيقي موضوع في public/audio يغلب الموسيقى المولَّدة
    stopSynth();
    if (!fileEl || !fileEl.src.endsWith(`music-${m}.mp3`)) { stopFile(); fileEl = new Audio(`/audio/music-${m}.mp3`); fileEl.loop = true; }
    applyVol(); fileEl.play().catch(() => { /* يحتاج تفاعلًا */ });
  } else { stopFile(); startSynth(m); }
}

const play = (name: SfxName) => {
  const c = ensure();
  if (!c || !unlocked || !isSfxOn()) return;
  if (c.state === "suspended") c.resume();
  playSfx(c, sfxOut, name, c.currentTime + 0.01);
};

export const audio = {
  /** يُستدعى من أول ضغطة/مفتاح. */
  unlock() {
    const c = ensure(); if (!c) return;
    c.resume(); unlocked = true; syncMusic();
  },
  setMood(m: Mood | null) { wantMood = m; syncMusic(); },
  /** مقدمة الدخول السينمائية (قناة الموسيقى). */
  playIntroCue() {
    const c = ensure(); if (!c) return;
    c.resume(); unlocked = true;
    if (!isMusicOn()) return;
    stopSynth(); stopFile();
    introBus = c.createGain(); introBus.gain.value = 1.9; introBus.connect(musicOut);
    playIntro(c, introBus, c.currentTime + 0.05);
    introUntil = performance.now() + 4300; window.setTimeout(syncMusic, 4350);
  },
  stopIntroCue() {
    introUntil = 0;
    if (ctx && introBus) { const b = introBus; introBus = null; b.gain.setValueAtTime(b.gain.value, ctx.currentTime); b.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4); window.setTimeout(() => b.disconnect(), 600); }
    syncMusic();
  },
  setMusicOn(v: boolean) { wr(K.music, v ? "1" : "0"); applyVol(); syncMusic(); },
  setSfxOn(v: boolean) { wr(K.sfx, v ? "1" : "0"); applyVol(); },
  setMusicVol(v: number) { wr(K.mvol, String(v)); applyVol(); },
  setSfxVol(v: number) { wr(K.svol, String(v)); applyVol(); },
  setAllMuted(m: boolean) { wr(K.music, m ? "0" : "1"); wr(K.sfx, m ? "0" : "1"); applyVol(); syncMusic(); },
  /** تعليق الصوت عند إخفاء التبويب. */
  visibility(visible: boolean) {
    if (!ctx || !unlocked) return;
    if (visible) { ctx.resume(); fileEl?.play().catch(() => undefined); } else { ctx.suspend(); fileEl?.pause(); }
  },
};
export const setMuted = (m: boolean) => audio.setAllMuted(m);

export const sfx = {
  tap: () => play("tap"), select: () => play("select"), ask: () => play("ask"), incoming: () => play("incoming"),
  yes: () => play("yes"), no: () => play("no"), unsure: () => play("unsure"), answered: () => play("answered"),
  wrong: () => play("wrong"), reveal: () => play("reveal"), turn: () => play("turn"), round: () => play("round"),
  win: () => play("win"), lose: () => play("lose"), cover: () => play("cover"),
};
export type { Mood };
