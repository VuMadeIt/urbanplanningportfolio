// The in-car screen: Liam's "hire me" reel plays muted (its captions are burned in) until you ask for sound.
import { sound } from './audio.js';

export function enableHireScreen() {
  const video = document.querySelector('[data-hire]');
  const btn = document.querySelector('[data-hire-sound]');
  if (!video || !btn) return;
  const label = btn.querySelector('span');
  const paint = () => {
    const on = !video.muted;
    btn.setAttribute('aria-pressed', String(on));
    label.textContent = on ? 'Mute' : 'Play with sound';
  };
  const unmute = () => { video.muted = false; video.currentTime = 0; video.play().catch(() => {}); paint(); };
  btn.addEventListener('click', () => { if (video.muted) unmute(); else { video.muted = true; paint(); } });
  // turning the site's sound on also turns the screen's sound on, if you are looking at it
  document.querySelector('[data-sound]')?.addEventListener('click', () => {
    const r = video.getBoundingClientRect();
    const seen = r.bottom > 0 && r.top < innerHeight && video.offsetParent;
    if (sound.on && seen && video.muted) unmute();
    else if (!sound.on && !video.muted) { video.muted = true; paint(); }
  });
  // leaving the car mutes it
  window.addEventListener('hashchange', () => { if (!video.muted) { video.muted = true; paint(); } });
  paint();
}
