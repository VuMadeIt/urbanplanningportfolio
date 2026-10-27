// Every sound is synthesized: no recordings, nothing to download. Off until the visitor turns it on.
let ctx = null;
let master = null;
let enabled = localStorage.getItem('lv-sound') === 'on';

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export const sound = {
  get on() { return enabled; },
  set(on) {
    enabled = on;
    localStorage.setItem('lv-sound', on ? 'on' : 'off');
    if (on) ensure();
  },
};

function tone(freq, start, dur, { type = 'sine', gain = 0.25, partials = [1] } = {}) {
  const t0 = ctx.currentTime + start;
  partials.forEach((p, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq * p;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain / (i + 1), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  });
}

/** Subway door chime: three falling notes before the doors close */
export function chimeClose() {
  if (!enabled || !ensure()) return;
  [880, 740, 587].forEach((f, i) => tone(f, i * 0.16, 0.5, { partials: [1, 2.01], gain: 0.22 }));
}
/** Doors open: two rising notes */
export function chimeOpen() {
  if (!enabled || !ensure()) return;
  [587, 880].forEach((f, i) => tone(f, i * 0.14, 0.45, { partials: [1, 2.01], gain: 0.18 }));
}
/** Streetcar gong: ding ding */
export function gong() {
  if (!enabled || !ensure()) return;
  [0, 0.32].forEach((s) => tone(1180, s, 0.9, { partials: [1, 2.76, 5.4], gain: 0.2 }));
}
/** Bike bell */
export function bell() {
  if (!enabled || !ensure()) return;
  for (let i = 0; i < 6; i++) tone(2350 + (i % 2) * 90, i * 0.045, 0.35, { partials: [1, 2.4], gain: 0.08 });
}
/** Train rumble: filtered noise that swells and fades */
export function rumble(duration = 3, peak = 0.35) {
  if (!enabled || !ensure()) return;
  const len = Math.floor(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  const g = ctx.createGain();
  const t0 = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + duration * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(lp).connect(g).connect(master);
  src.start(t0);
}
