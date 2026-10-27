import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import credits from '../public/media/credits.json';
import { skylineSVG, stopPoleSVG } from './kit.js';

gsap.registerPlugin(ScrollTrigger);

export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------------- Fit the monument names to their walls ---------------- */
export function fitNames(scope = document) {
  if (!scope) return;
  scope.querySelectorAll('.wall-name, .street-name, .road-name').forEach((el) => {
    const box = el.parentElement.getBoundingClientRect();
    if (!box.width) return;
    el.style.setProperty('--fit', '100px');
    el.style.width = 'max-content';
    const lines = el.querySelectorAll('.wall-word, .rl');
    const stacked = lines.length > 1 && getComputedStyle(lines[0]).display === 'block';
    const widest = stacked ? Math.max(...[...lines].map((l) => l.getBoundingClientRect().width)) : el.getBoundingClientRect().width;
    el.style.width = '';
    const isRoad = el.classList.contains('road-name');
    const isStreet = el.classList.contains('street-name');
    const phone = window.innerWidth < 760;
    const targetW = box.width * (isRoad ? 0.66 : isStreet ? 0.96 : el.closest('.wall--art') ? (phone ? 0.6 : 0.68) : el.closest('.platform') && phone ? 0.8 : 0.9);
    const nLines = stacked ? lines.length : 1;
    const hero = el.closest('.hero');
    const streetRoom = isStreet && hero ? hero.clientHeight - hero.querySelector('.street').offsetHeight - hero.querySelector('.street-foot').offsetHeight - 64 - 24 : 0;
    let maxH = isRoad ? box.height * 0.5 / 1.45 : isStreet ? Math.max(120, streetRoom) : box.height * (el.closest('.platform') ? (window.innerWidth < 760 ? 0.34 : 0.42) : 0.62);
    let size = (100 * targetW) / widest;
    size = Math.min(size, maxH / (0.82 * nLines));
    el.style.setProperty('--fit', `${Math.max(40, Math.floor(size))}px`);
  });
}

/* ---------------- Drawn street furniture ---------------- */
export function drawStreets() {
  document.querySelectorAll('[data-skyline]').forEach((el, i) => (el.innerHTML = skylineSVG(11 + i * 5)));
  document.querySelectorAll('[data-stop-pole]').forEach((el) => (el.innerHTML = stopPoleSVG()));
}

/* ---------------- Road text: one line per word ---------------- */
export function splitRoadNames() {
  document.querySelectorAll('.road-name').forEach((el) => {
    if (el.querySelector('.rl')) return;
    const vh = el.querySelector('.vh');
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim();
    el.innerHTML = text.split(/\s+/).map((w) => `<span class="rl">${w}</span>`).join('');
    if (vh) el.append(vh);
  });
}

/* ---------------- Instagram's embed script, loaded once, only when a reel is played ---------------- */
let igScript = null;
export function loadIgScript() {
  if (igScript) return igScript;
  igScript = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://www.instagram.com/embed.js';
    s.async = true;
    s.onload = () => resolve(window.instgrm);
    s.onerror = () => { igScript = null; resolve(null); };
    document.head.appendChild(s);
  });
  return igScript;
}

export function fillTracks() {
  document.querySelectorAll('.reel-track').forEach(addTrackButtons);
}

/* ---------------- Horizontal tracks: drag with a mouse, buttons for everyone ---------------- */
function addTrackButtons(track) {
  if (track.nextElementSibling?.classList.contains('track-buttons')) return;
  const nav = document.createElement('div');
  nav.className = 'track-buttons';
  nav.innerHTML = `<button type="button" data-dir="-1" aria-label="Scroll back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H6M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2"/></svg></button>
    <button type="button" data-dir="1" aria-label="Scroll forward"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2"/></svg></button>`;
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    track.scrollBy({ left: Number(b.dataset.dir) * track.clientWidth * 0.8, behavior: reduced.matches ? 'auto' : 'smooth' });
  });
  track.after(nav);
}
export function enableDrag() {
  document.querySelectorAll('[data-drag]').forEach((track) => {
    let down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; track.classList.add('is-dragging'); }
      track.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => { down = false; track.classList.remove('is-dragging'); });
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  });
}

/* ---------------- YouTube: poster first, player on demand ---------------- */
export function enableVideos() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-yt]');
    if (!btn) return;
    const id = btn.dataset.yt;
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    frame.title = btn.getAttribute('aria-label').replace(/^Play: /, '');
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    frame.dataset.poster = '1';
    posters.set(frame, btn);
    btn.replaceWith(frame);
    frame.focus();
  });
}
const posters = new WeakMap();
/** Leaving a station stops its videos: the poster comes back */
export function stopVideos(scope) {
  scope.querySelectorAll('iframe[data-poster]').forEach((f) => { const b = posters.get(f); if (b) f.replaceWith(b); });
  scope.querySelectorAll('video').forEach((v) => v.pause());
}

/* ---------------- Muted loops: play only while seen ---------------- */
const videoObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const v = e.target;
    if (e.isIntersecting && !reduced.matches && !document.hidden) v.play().catch(() => {});
    else v.pause();
  }
}, { threshold: 0.15 });
export function watchVideos() {
  document.querySelectorAll('video[data-autoplay]').forEach((v) => {
    v.preload = 'metadata';
    videoObserver.observe(v);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) document.querySelectorAll('video[data-autoplay]').forEach((v) => v.pause());
  });
}

/* ---------------- Entrances, once ---------------- */
const revealObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('is-in');
    revealObserver.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -4% 0px', threshold: 0.01 });
// pictures start opening just before they enter, so no blank band is ever on screen for long
const shutterObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('is-in');
    shutterObserver.unobserve(e.target);
  }
}, { rootMargin: '0px 0px 10% 0px', threshold: 0 });
/** Show anything already on screen (a safety net for fast scrolling) */
export function revealVisible() {
  const h = window.innerHeight;
  document.querySelectorAll('.station.is-current [data-reveal]:not(.is-in), .station.is-current .shutter:not(.is-in)').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < h * 0.98 && r.bottom > 0) { el.classList.add('is-in'); revealObserver.unobserve(el); }
  });
}
export function watchReveals() {
  // stagger siblings that share a parent, in reading order
  const groups = new Map();
  document.querySelectorAll('[data-reveal], [data-reveal-shutter]').forEach((el) => {
    const p = el.parentElement;
    const i = groups.get(p) || 0;
    el.style.setProperty('--rd', `${Math.min(i, 6) * 80}ms`);
    groups.set(p, i + 1);
    if (el.hasAttribute('data-reveal-shutter')) { el.classList.add('shutter'); shutterObserver.observe(el); }
    else revealObserver.observe(el);
  });
}

/* ---------------- Figures count up once ---------------- */
const countObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    countObserver.unobserve(e.target);
    const el = e.target;
    el.dataset.counted = '1';
    const end = Number(el.dataset.count);
    if (reduced.matches) continue;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: end > 100 ? 1.0 : 0.6, ease: 'power3.out',
      onUpdate: () => (el.textContent = Math.round(obj.v).toLocaleString('en-CA')),
    });
  }
}, { threshold: 0.6 });
export function watchCounts() {
  document.querySelectorAll('[data-count]').forEach((el) => countObserver.observe(el));
}

/* ---------------- Case studies: the title tears at the seam ---------------- */
export function buildSeams() {
  if (reduced.matches) return;
  document.querySelectorAll('[data-seam]').forEach((seam) => {
    const img = seam.querySelector('.seam-pane--left img');
    const tl = seam.querySelector('.seam-half--l');
    const tr = seam.querySelector('.seam-half--r');
    // the title tears as the photo enters and leaves, and is whole while it fills the screen
    gsap.timeline({ scrollTrigger: { trigger: seam, start: 'top bottom', end: 'bottom top', scrub: true } })
      .fromTo(img, { yPercent: 6 }, { yPercent: -6, ease: 'none', duration: 1 }, 0)
      .fromTo(tl, { yPercent: 45 }, { yPercent: 0, ease: 'power2.out', duration: 0.38 }, 0)
      .fromTo(tr, { yPercent: -45 }, { yPercent: 0, ease: 'power2.out', duration: 0.38 }, 0)
      .to(tl, { yPercent: -45, ease: 'power2.in', duration: 0.38 }, 0.62)
      .to(tr, { yPercent: 45, ease: 'power2.in', duration: 0.38 }, 0.62);
  });
}

/* ---------------- Credits for every found picture and clip ---------------- */
export function renderCredits() {
  const list = document.querySelector('[data-credits]');
  if (!list) return;
  const used = new Set([...document.querySelectorAll('img[src*="/media/"], video source[src*="/media/"], video[poster*="/media/"]')]
    .map((el) => (el.getAttribute('src') || el.getAttribute('poster')).split('/').pop()));
  const items = credits.filter((c) => used.has(c.file.split('/').pop()) || (c.media === 'video' && used.has(c.file.split('/').pop())));
  list.innerHTML = items.map((c) => `<li><a class="link" href="${c.page}" target="_blank" rel="noopener">${c.title}</a> by ${c.creator}, <a class="link" href="${c.licenseUrl}" target="_blank" rel="noopener">${c.license}</a>, via ${c.via}.</li>`).join('') +
    '<li>Paintings, sketches, reel covers, portraits and video stills: Liam Vu, from his Instagram and YouTube. Pencil versions of the photographs, tile walls, trains, streetcar, bike and street drawings made for this site.</li>';
}
