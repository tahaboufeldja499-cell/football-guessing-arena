let ctx: AudioContext | null = null;
export const isMuted = () => typeof window !== "undefined" && localStorage.getItem("fga-muted") === "1";
export const setMuted = (m: boolean) => localStorage.setItem("fga-muted", m ? "1" : "0");

function tone(freqs: number[], dur = 0.12, type: OscillatorType = "sine") {
  if (typeof window === "undefined" || isMuted()) return;
  try {
    ctx = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const t0 = ctx.currentTime;
    freqs.forEach((f, i) => {
      const o = ctx!.createOscillator(); const g = ctx!.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + i * dur);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + i * dur + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * dur);
      o.connect(g).connect(ctx!.destination); o.start(t0 + i * dur); o.stop(t0 + (i + 1) * dur + 0.02);
    });
  } catch { /* الصوت اختياري */ }
}
export const sfx = {
  incoming: () => tone([660, 880]),
  answered: () => tone([523, 659]),
  win: () => tone([523, 659, 784, 1046], 0.14, "triangle"),
  lose: () => tone([330, 247], 0.18, "sawtooth"),
};
