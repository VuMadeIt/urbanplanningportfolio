// Every sound is synthesized: no recordings, nothing to download. Off until the visitor turns it on.
let ctx = null;
let master = null;
let enabled = localStorage.getItem('lv-sound') !== 'off'; // on unless the visitor turned it off

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
    if (on) { ensure(); preloadAnnouncements(); }
    window.dispatchEvent(new CustomEvent('soundchange', { detail: on }));
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

/* ---------------- Station announcements and the sound of the car ----------------
   public/audio holds real TTC recordings (CC BY 4.0, PascalHD via Wikimedia Commons): "Please stand
   clear of the doors", "Doors will open on the left/right" and the car moving between Museum and
   Queen's Park. The TTC's own voice can't say "Liam Vu", so the station names are synthesized
   (Kokoro, Apache 2.0) and passed through a small PA-speaker filter to sit beside the real clips. */
const buffers = new Map();
const CLIPS = ['arriving-home', 'welcome', 'stand-clear', 'doors-left', 'doors-right', 'ride-bed',
  ...['social', 'art', 'contact', 'shrine'].map((s) => `arriving-${s}`),
  ...['home', 'social', 'art', 'contact', 'projects', 'case-studies', 'shrine'].map((s) => `next-${s}`)];
function clip(name) {
  if (!ensure()) return Promise.resolve(null);
  if (!buffers.has(name)) {
    buffers.set(name, fetch(`/audio/${name}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((b) => (b ? ctx.decodeAudioData(b) : null)).catch(() => null));
  }
  return buffers.get(name);
}
export function preloadAnnouncements() { if (enabled) CLIPS.forEach(clip); }

let pending = [];   // scheduled clips that have not started yet
let voiceEnd = 0;   // when the last scheduled clip finishes
/** Announcements play to the end and never talk over each other. A new announcement waits for the one
 *  playing now; anything still waiting its turn from an older ride is dropped, since you are going elsewhere. */
export function say(names, { queue = false, delay = 0 } = {}) {
  if (!enabled || !ensure()) return;
  const now = ctx.currentTime;
  if (!queue) {
    pending = pending.filter((p) => {
      if (p.start > now + 0.02) { try { p.src.stop(); } catch {} return false; }
      return true;
    });
    voiceEnd = pending.reduce((m, p) => Math.max(m, p.end), 0);
  }
  Promise.all(names.map(clip)).then((bufs) => {
    let t = Math.max(ctx.currentTime + delay, voiceEnd ? voiceEnd + 0.25 : 0);
    for (const b of bufs) {
      if (!b) continue;
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.connect(master);
      src.start(t);
      const item = { src, start: t, end: t + b.duration };
      pending.push(item);
      src.onended = () => { pending = pending.filter((p) => p !== item); };
      t += b.duration + 0.2;
    }
    voiceEnd = Math.max(voiceEnd, t - 0.2);
  });
}

/** The real car moving: fades in, holds, fades out */
export function rideSound(duration = 2.5, level = 0.9) {
  if (!enabled || !ensure()) return;
  clip('ride-bed').then((b) => {
    if (!b) { rumble(duration, 0.35); return; }
    const s = ctx.createBufferSource();
    const g = ctx.createGain();
    const t0 = ctx.currentTime;
    s.buffer = b;
    s.loop = true;
    s.loopStart = 1; s.loopEnd = b.duration - 1;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(level, t0 + Math.min(0.6, duration * 0.3));
    g.gain.setValueAtTime(level, t0 + duration * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + 0.6);
    s.connect(g).connect(master);
    s.start(t0, 2 + Math.random() * 10);
    s.stop(t0 + duration + 0.7);
  });
}

/* Browsers keep sound asleep until the visitor touches the page: wake it on the first touch */
['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => { if (enabled) { ensure(); preloadAnnouncements(); } }, { once: true, passive: true }));

/** A heavenly chord for the shrine: soft voices swelling under the spotlight */
export function choir(duration = 4.5) {
  if (!enabled || !ensure()) return;
  const t0 = ctx.currentTime;
  [261.6, 329.6, 392.0, 523.3].forEach((f, i) => {
    for (const detune of [-6, 6]) {
      const o = ctx.createOscillator();
      const flt = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = detune;
      flt.type = 'bandpass'; flt.frequency.value = 900 + i * 180; flt.Q.value = 1.2;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.035, t0 + 1.2 + i * 0.15);
      g.gain.setValueAtTime(0.035, t0 + duration - 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      o.connect(flt).connect(g).connect(master);
      o.start(t0); o.stop(t0 + duration + 0.1);
    }
  });
}
