/** تركيب الصوت بالكود (WebAudio): دوال نقية تأخذ سياق صوت ووجهة، فيمكن اختبارها بـ OfflineAudioContext. */
export type Mood = "menu" | "match" | "win";
export type SfxName = "tap" | "select" | "ask" | "incoming" | "yes" | "no" | "unsure" | "answered" | "wrong" | "reveal" | "turn" | "round" | "win" | "lose" | "cover";
type Ctx = BaseAudioContext;
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(ctx: Ctx): AudioBuffer {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, b);
  }
  return b;
}

interface Tone { t: number; f: number; dur: number; type?: OscillatorType; gain?: number; a?: number; r?: number; detune?: number; lp?: number; f2?: number; hold?: boolean }
function tone(ctx: Ctx, dest: AudioNode, o: Tone) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.f, o.t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, o.t + o.dur);
  if (o.detune) osc.detune.value = o.detune;
  const a = o.a ?? 0.01, r = o.r ?? 0.15, peak = o.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.linearRampToValueAtTime(peak, o.t + a);
  if (o.hold) g.gain.setValueAtTime(peak, o.t + Math.max(a, o.dur));
  g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur + r);
  if (o.lp) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.lp; osc.connect(f); f.connect(g); } else osc.connect(g);
  g.connect(dest);
  osc.start(o.t); osc.stop(o.t + o.dur + r + 0.05);
}

interface Burst { t: number; dur: number; gain?: number; type?: BiquadFilterType; f: number; f2?: number; q?: number; a?: number }
function burst(ctx: Ctx, dest: AudioNode, o: Burst) {
  const s = ctx.createBufferSource(); s.buffer = noise(ctx); s.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = o.type ?? "bandpass";
  fl.frequency.setValueAtTime(o.f, o.t);
  if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, o.t + o.dur);
  fl.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.linearRampToValueAtTime(o.gain ?? 0.15, o.t + (o.a ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);
  s.connect(fl); fl.connect(g); g.connect(dest);
  s.start(o.t, Math.random()); s.stop(o.t + o.dur + 0.05);
}
const kick = (ctx: Ctx, d: AudioNode, t: number, gain = 0.4, len = 0.22) => {
  tone(ctx, d, { t, f: 150, f2: 42, dur: len, gain, a: 0.003, r: 0.05 });
  burst(ctx, d, { t, dur: 0.03, gain: gain * 0.25, type: "highpass", f: 2500 });
};

/* ================= الموسيقى ================= */
const MINOR = [[50, 57, 62, 65], [46, 53, 58, 62], [53, 57, 60, 65], [48, 55, 60, 64]]; // Dm Bb F C
const MAJOR = [[50, 57, 62, 66], [45, 52, 57, 61], [47, 54, 59, 62], [43, 50, 55, 59]]; // D A Bm G
const BPM: Record<Mood, number> = { menu: 66, match: 84, win: 100 };

/** يجدول مازورة واحدة (4 نبضات) ويعيد طولها بالثواني. */
export function scheduleBar(ctx: Ctx, dest: AudioNode, t0: number, bar: number, mood: Mood): number {
  const beat = 60 / BPM[mood], len = beat * 4, ch = (mood === "win" ? MAJOR : MINOR)[bar % 4];
  for (const m of ch) for (const dt of [-7, 7])
    tone(ctx, dest, { t: t0, f: hz(m), dur: len * 0.95, type: "sawtooth", gain: 0.017, a: len * 0.3, r: len * 0.35, detune: dt, lp: mood === "menu" ? 900 : 1300, hold: true });
  tone(ctx, dest, { t: t0, f: hz(ch[0] - 12), dur: len * 0.9, type: "sine", gain: 0.17, a: 0.05, r: 0.4, hold: true });
  // أرباع/ثُمنيات متناسقة
  const steps = mood === "menu" ? 4 : 8, stepLen = len / steps;
  for (let i = 0; i < steps; i++) {
    const n = ch[(mood === "win" ? [0, 1, 2, 3, 2, 1, 2, 3] : [0, 2, 1, 3, 2, 1, 3, 2])[i % 8]] + 12;
    tone(ctx, dest, { t: t0 + i * stepLen, f: hz(n), dur: stepLen * 0.8, type: "triangle", gain: mood === "menu" ? 0.035 : 0.028, a: 0.008, r: 0.25 });
  }
  burst(ctx, dest, { t: t0, dur: len, gain: mood === "menu" ? 0.006 : 0.016, type: "bandpass", f: 850, q: 0.5, a: len * 0.4 });   // همس الجمهور
  if (mood !== "menu") {
    for (let b = 0; b < 4; b++) {
      const t = t0 + b * beat;
      if (mood === "win" || b % 2 === 0) kick(ctx, dest, t, mood === "win" ? 0.36 : 0.3);
      if (b % 2 === 1) burst(ctx, dest, { t, dur: 0.14, gain: 0.07, f: 1800, q: 0.8 });
      burst(ctx, dest, { t: t + beat / 2, dur: 0.05, gain: 0.022, type: "highpass", f: 7000 });
    }
    if (mood === "win") for (const m of ch) tone(ctx, dest, { t: t0, f: hz(m), dur: beat * 1.5, type: "sawtooth", gain: 0.03, a: 0.04, r: 0.5, lp: 2400 });
  }
  return len;
}

/* ================= مقدمة الدخول (~6 ث): متزامنة مع حركة المقدمة المرئية ================= */
export function playIntro(ctx: Ctx, dest: AudioNode, t0: number) {
  const T = (s: number) => t0 + s;
  // هدير منخفض يتصاعد + جمهور بعيد
  for (const [m, dt] of [[38, -6], [38, 6], [45, 0]] as const) {
    const osc = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    osc.type = "sawtooth"; osc.frequency.value = hz(m); osc.detune.value = dt;
    lp.type = "lowpass"; lp.frequency.setValueAtTime(110, T(0)); lp.frequency.exponentialRampToValueAtTime(1000, T(1.25)); lp.frequency.exponentialRampToValueAtTime(260, T(5));
    g.gain.setValueAtTime(0.0001, T(0)); g.gain.linearRampToValueAtTime(0.07, T(1.2)); g.gain.exponentialRampToValueAtTime(0.0001, T(5.6));
    osc.connect(lp); lp.connect(g); g.connect(dest); osc.start(T(0)); osc.stop(T(5.7));
  }
  burst(ctx, dest, { t: T(0), dur: 4.6, gain: 0.13, f: 700, q: 0.5, a: 1.6 });
  // نقرات اشتعال الأضواء (مطابقة لوميض الصورة)
  for (const s of [0.44, 0.55, 0.82, 0.97, 1.24]) {
    burst(ctx, dest, { t: T(s), dur: 0.07, gain: 0.13, type: "highpass", f: 3000 });
    tone(ctx, dest, { t: T(s), f: 110, dur: 0.06, type: "square", gain: 0.05, r: 0.05 });
  }
  // صاعد قبل الضربة
  tone(ctx, dest, { t: T(0.3), f: 180, f2: 1500, dur: 0.95, type: "sawtooth", gain: 0.045, a: 0.5, r: 0.05, lp: 2500 });
  burst(ctx, dest, { t: T(0.3), dur: 0.95, gain: 0.1, type: "bandpass", f: 500, f2: 8000, q: 1.2, a: 0.8 });
  // الضربة الكبرى عند ظهور العنوان
  kick(ctx, dest, T(1.25), 0.6, 0.65);
  burst(ctx, dest, { t: T(1.25), dur: 0.55, gain: 0.22, type: "lowpass", f: 400 });
  burst(ctx, dest, { t: T(1.25), dur: 2.0, gain: 0.1, type: "highpass", f: 5000, a: 0.02 });
  for (const m of [50, 53, 57, 62]) tone(ctx, dest, { t: T(1.25), f: hz(m), dur: 0.9, type: "sawtooth", gain: 0.075, a: 0.03, r: 1.0, lp: 2000 });
  // وسادة تتفتح مع الشعار ثم لمعة عند ظهور زر الدخول
  for (const m of [50, 57, 62, 65]) tone(ctx, dest, { t: T(2.2), f: hz(m), dur: 2.6, type: "sawtooth", gain: 0.02, a: 0.9, r: 1.8, lp: 1200, hold: true });
  tone(ctx, dest, { t: T(2.9), f: 1568, dur: 0.4, gain: 0.07, r: 0.9 });
  tone(ctx, dest, { t: T(3.02), f: 2093, dur: 0.4, gain: 0.06, r: 0.9 });
}

/* ================= المؤثرات ================= */
/** يشغّل مؤثرًا ويعيد مدته التقريبية بالثواني. */
export function playSfx(ctx: Ctx, d: AudioNode, name: SfxName, t: number): number {
  switch (name) {
    case "tap": tone(ctx, d, { t, f: 950, dur: 0.03, type: "triangle", gain: 0.17, r: 0.04 }); return 0.1;
    case "select": tone(ctx, d, { t, f: 660, dur: 0.07, type: "triangle", gain: 0.15 }); tone(ctx, d, { t: t + 0.07, f: 990, dur: 0.12, type: "triangle", gain: 0.15, r: 0.2 }); return 0.4;
    case "ask": burst(ctx, d, { t, dur: 0.38, gain: 0.3, f: 400, f2: 3200, q: 2, a: 0.1 }); tone(ctx, d, { t, f: 520, f2: 800, dur: 0.18, gain: 0.2 }); return 0.5;
    case "incoming": tone(ctx, d, { t, f: 784, dur: 0.12, gain: 0.22, r: 0.6 }); tone(ctx, d, { t: t + 0.15, f: 1047, dur: 0.15, gain: 0.22, r: 0.8 }); return 1.1;
    case "yes": [523, 659, 784].forEach((f, i) => tone(ctx, d, { t: t + i * 0.07, f, dur: 0.1, type: "triangle", gain: 0.19, r: 0.25 })); return 0.6;
    case "no": tone(ctx, d, { t, f: 200, f2: 120, dur: 0.28, gain: 0.28, r: 0.1 }); burst(ctx, d, { t, dur: 0.12, gain: 0.12, type: "lowpass", f: 220 }); return 0.5;
    case "unsure": tone(ctx, d, { t, f: 466, dur: 0.12, type: "triangle", gain: 0.17 }); tone(ctx, d, { t: t + 0.13, f: 415, dur: 0.18, type: "triangle", gain: 0.17, r: 0.25 }); return 0.6;
    case "answered": tone(ctx, d, { t, f: 659, dur: 0.1, gain: 0.2, r: 0.4 }); tone(ctx, d, { t: t + 0.11, f: 880, dur: 0.14, gain: 0.2, r: 0.5 }); return 0.8;
    case "wrong": tone(ctx, d, { t, f: 190, f2: 105, dur: 0.42, type: "sawtooth", gain: 0.17, lp: 900, r: 0.1 }); tone(ctx, d, { t, f: 197, f2: 108, dur: 0.42, type: "sawtooth", gain: 0.1, lp: 900, r: 0.1 }); return 0.6;
    case "reveal": burst(ctx, d, { t, dur: 0.7, gain: 0.13, type: "highpass", f: 500, f2: 6000, a: 0.3 }); [1568, 2093, 2637].forEach((f, i) => tone(ctx, d, { t: t + 0.3 + i * 0.09, f, dur: 0.2, gain: 0.075, r: 0.7 })); return 1.4;
    case "turn": burst(ctx, d, { t, dur: 0.3, gain: 0.45, f: 300, f2: 1300, q: 1.5, a: 0.08 }); return 0.4;
    case "round": [523, 659, 784, 1047].forEach((f) => tone(ctx, d, { t, f, dur: 0.45, type: "triangle", gain: 0.14, r: 0.6 })); return 1.1;
    case "win":
      [587, 740, 880, 1175].forEach((f, i) => tone(ctx, d, { t: t + i * 0.13, f, dur: i === 3 ? 0.9 : 0.12, type: "sawtooth", gain: 0.1, lp: 2600, r: i === 3 ? 0.9 : 0.15 }));
      burst(ctx, d, { t: t + 0.3, dur: 2.2, gain: 0.17, f: 1000, q: 0.4, a: 0.4 });
      burst(ctx, d, { t: t + 0.5, dur: 1.5, gain: 0.07, type: "highpass", f: 6000, a: 0.02 });
      return 2.6;
    case "lose": [392, 330, 262].forEach((f, i) => tone(ctx, d, { t: t + i * 0.2, f, dur: 0.25, gain: 0.18, r: 0.5 })); return 1.2;
    case "cover": burst(ctx, d, { t, dur: 0.25, gain: 0.4, f: 1500, f2: 500, q: 1, a: 0.05 }); return 0.3;
  }
}
