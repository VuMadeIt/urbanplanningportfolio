import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { stations } from './data.js';
import { runIntro } from './intro.js';
import { ride, isRiding, skipRide, ridingTo } from './ride.js';
import { sound, choir } from './audio.js';
import { startLiveStats } from './stats.js';
import { enableHireScreen } from './hire.js';
import {
  reduced, fitNames, drawStreets, splitRoadNames, fillTracks, enableDrag, enableVideos, stopVideos,
  watchVideos, watchReveals, revealVisible, watchCounts, buildSeams, renderCredits,
} from './content.js';
import {
  renderSigns, renderColumns, glassFor, refreshGlass, dropGlass, renderReels, enablePlayer, closePlayer,
  enablePaint, enableLineMaps, sizeLines, renderNextMaps, enableJumps, keepFocusedInView, renderShrine,
} from './art.js';

gsap.registerPlugin(ScrollTrigger);

const html = document.documentElement;
const byId = Object.fromEntries(stations.map((s) => [s.id, s]));
const bar = document.getElementById('bar');
const car = document.getElementById('car');
const announcer = document.getElementById('announcer');
const heroInk = { home: '#ffffff', social: '#ffffff', 'case-studies': '#ffffff', projects: '#f4f4f1', shrine: '#e9c46a', art: '#ffffff', about: '#ffffff', contact: '#ffffff' };

let current = 'home';
let lenis = null;
let intro = null;
let rides = 0;
const heroTimelines = new Map();

// About now lives on the home page: old #/about links still land there
const ALIASES = { about: 'home' };
const hashId = () => location.hash.replace(/^#\/?/, '');
const idFromHash = () => {
  const h = hashId();
  if (Object.hasOwn(ALIASES, h)) return ALIASES[h];
  return Object.hasOwn(byId, h) ? h : 'home';
};
const hashIsValid = () => {
  const h = hashId();
  return h === '' || Object.hasOwn(byId, h) || Object.hasOwn(ALIASES, h);
};

/* ---------------- Boot ---------------- */
drawStreets();
splitRoadNames();
renderSigns();
renderColumns();
renderShrine();
renderReels();
renderNextMaps();
fillTracks();
enablePaint();
enableDrag();
enableVideos();
renderCredits();
watchReveals();
watchCounts();
watchVideos();
startLiveStats();
enableHireScreen();

if (!reduced.matches) {
  lenis = new Lenis({ lerp: 0.12, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
enablePlayer(() => lenis);
keepFocusedInView();

/* ---------------- Stations ---------------- */
function setStation(id) {
  const prev = document.querySelector('.station.is-current');
  if (prev && prev.id !== id) { dropGlass(prev); stopVideos(prev); }
  prev?.classList.remove('is-current');
  const el = document.getElementById(id);
  el.classList.add('is-current');
  document.body.dataset.station = id;
  current = id;
  document.title = id === 'home' ? 'Liam Vu · The Urban Planning Influencer' : `${byId[id].name} · Liam Vu`;
  document.querySelectorAll('[data-ride]').forEach((a) => {
    if (a.dataset.ride === id && (a.closest('.linemap') || a.closest('.stops-sheet'))) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  lenis?.scrollTo(0, { immediate: true, force: true });
  paintBar();
  return el;
}

function arrive(id, { assemble = false } = {}) {
  const el = document.getElementById(id);
  fitNames(el);
  glassFor(el, { assemble });
  requestAnimationFrame(() => { ScrollTrigger.refresh(); lenis?.resize(); sizeLines(el); revealVisible(); });
  announcer.textContent = id === 'home' ? 'Liam Vu station' : `Arriving at ${byId[id].name}`;
}

/* Finish any entrance still running so nothing is ever left half-faded */
function settleEntrances() {
  heroTimelines.forEach((tl) => tl.progress(1).kill());
  heroTimelines.clear();
}

/* Hero entrances: each kind of stop arrives its own way */
function revealHero(id) {
  const el = document.getElementById(id);
  const name = el.querySelector('.station-name');
  if (!reduced.matches) {
    settleEntrances();
    const tl = gsap.timeline({ onComplete: () => heroTimelines.delete(id) });
    if (el.querySelector('.hero--subway')) {
      tl.from(el.querySelectorAll('.floor > *, .wall-sign'), { y: 18, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.1);
    } else if (el.querySelector('.hero--street')) {
      tl.from(name, { yPercent: 30, opacity: 0, duration: 1, ease: 'expo.out' })
        .from(el.querySelector('.street-skyline'), { yPercent: 14, duration: 1.2, ease: 'expo.out' }, 0)
        .from(el.querySelector('.street-stop'), { yPercent: 8, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.15)
        .from(el.querySelectorAll('.street-foot > *'), { y: 18, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.25);
    } else if (el.querySelector('.hero--bike')) {
      tl.from(name.querySelectorAll('.rl'), { x: '-12vw', opacity: 0, duration: 1, stagger: 0.1, ease: 'expo.out' })
        .from(el.querySelector('.lane-stencil'), { x: -40, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.1)
        .from(el.querySelector('.lane-arrow'), { x: 40, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.2)
        .from(el.querySelectorAll('.lane-foot > *'), { y: 18, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.25);
    } else if (el.querySelector('.hero--shrine')) {
      // you step off the train; the square is dark; then the light comes down on her
      tl.set(el.querySelector('.hero--shrine'), { '--lit': 0 })
        .from(el.querySelector('.monument'), { y: 40, opacity: 0, duration: 1.2, ease: 'expo.out' }, 0)
        .from(el.querySelector('.shrine-hall'), { opacity: 0, duration: 1.4, ease: 'power2.out' }, 0)
        .fromTo(el.querySelector('.shrine-beam'), { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 1.1, ease: 'expo.out' }, 0.9)
        .to(el.querySelector('.hero--shrine'), { '--lit': 1, duration: 1.6, ease: 'power2.out' }, 1.0)
        .fromTo(el.querySelector('.shrine-glow'), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.8, ease: 'expo.out' }, 1.1)
        .call(() => choir(), null, 0.95)
        .from(el.querySelectorAll('.shrine-copy > *'), { y: 24, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'expo.out' }, 1.5);
    }
    heroTimelines.set(id, tl);
  }
  (name || document.querySelector('.greet'))?.focus?.({ preventScroll: true });
}

function greet() {
  revealHero('home');
}

/* ---------------- The bar: clear over the hero's top, solid once you scroll ---------------- */
function paintBar() {
  const scrolled = (lenis ? lenis.scroll : window.scrollY) > 8;
  const solid = scrolled;
  bar.classList.toggle('is-solid', solid);
  bar.style.setProperty('--bar-ink', solid ? '' : heroInk[current]);
}
if (lenis) lenis.on('scroll', paintBar);
window.addEventListener('scroll', paintBar, { passive: true });

/* A safety net: whatever is on screen when scrolling stops is shown, even if an observer missed it */
let settleT;
const onScrollSettle = () => { clearTimeout(settleT); settleT = setTimeout(revealVisible, 160); };
if (lenis) lenis.on('scroll', onScrollSettle);
window.addEventListener('scroll', onScrollSettle, { passive: true });

/* ---------------- Riding between stations ---------------- */
function go(id, { push = true, express = false } = {}) {
  if (intro) intro.skip();
  if (isRiding()) {
    if (ridingTo() === id) return; // a double click on the same stop
    skipRide();
  }
  closeSheet();
  closePlayer({ silent: true });
  settleEntrances();
  if (id === current) {
    lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
    return;
  }
  if (push) history.pushState({ id }, '', id === 'home' ? '#/' : `#/${id}`);
  const from = current;
  current = id;
  rides += 1;
  ride(from, id, {
    speed: express ? 1.9 : rides > 1 ? 1.35 : 1,
    swap: () => { setStation(id); arrive(id); },
    reveal: () => revealHero(id),
  });
}

document.addEventListener('click', (e) => {
  const skip = e.target.closest('a[data-skip]');
  if (skip) {
    e.preventDefault();
    if (intro) intro.skip();
    const target = document.querySelector('.station.is-current .station-name') || document.querySelector('.greet');
    target?.focus();
    return;
  }
  const a = e.target.closest('a[data-ride]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  go(a.dataset.ride);
});
window.addEventListener('hashchange', () => {
  if (!hashIsValid()) history.replaceState(null, '', '#/');
  const id = idFromHash();
  if (id !== current) go(id, { push: false, express: true });
});

/* ---------------- Phone stops sheet ---------------- */
const sheet = document.getElementById('stops-sheet');
const sheetBtn = document.querySelector('.stops-toggle');
function closeSheet({ restoreFocus = false } = {}) {
  if (sheet.hidden) return;
  sheet.hidden = true;
  sheetBtn.setAttribute('aria-expanded', 'false');
  sheetBtn.textContent = 'Stops';
  lenis?.start();
  if (restoreFocus) sheetBtn.focus();
}
function openSheet() {
  sheet.hidden = false;
  sheetBtn.setAttribute('aria-expanded', 'true');
  sheetBtn.textContent = 'Close';
  lenis?.stop();
  if (!reduced.matches) gsap.from(sheet.querySelectorAll('li'), { x: -24, opacity: 0, duration: 0.45, stagger: 0.04, ease: 'power3.out', clearProps: 'all' });
  sheet.querySelector('a')?.focus();
}
sheetBtn.addEventListener('click', () => (sheet.hidden ? openSheet() : closeSheet({ restoreFocus: true })));
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !sheet.hidden) closeSheet({ restoreFocus: true });
  // keep keyboard focus inside the open sheet (the toggle stays reachable to close it)
  if (e.key === 'Tab' && !sheet.hidden) {
    const items = [sheetBtn, ...sheet.querySelectorAll('a')];
    const i = items.indexOf(document.activeElement);
    const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === -1 || i === items.length - 1 ? 0 : i + 1);
    e.preventDefault();
    items[next].focus();
  }
});

/* ---------------- Sound toggle ---------------- */
const soundBtn = document.querySelector('[data-sound]');
const paintSound = () => {
  soundBtn.setAttribute('aria-pressed', String(sound.on));
  soundBtn.querySelector('.sound-label').textContent = sound.on ? 'Sound on' : 'Sound off';
};
soundBtn.addEventListener('click', () => { sound.set(!sound.on); paintSound(); });
window.addEventListener('soundchange', paintSound);
paintSound();

/* ---------------- Resize ---------------- */
let rz;
window.addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => {
    const el = document.getElementById(current);
    fitNames(el);
    refreshGlass(el);
    sizeLines(el);
    const platform = document.getElementById('platform');
    if (platform) { fitNames(platform); refreshGlass(platform); }
  }, 120);
});

/* ---------------- Start ---------------- */
if (!hashIsValid()) history.replaceState(null, '', '#/');
const start = idFromHash();
document.fonts?.ready.then(() => {
  const el = document.getElementById(current);
  fitNames(el);
  refreshGlass(el);
  sizeLines(el);
  const platform = document.getElementById('platform');
  if (platform) { fitNames(platform); refreshGlass(platform); }
});
buildSeams();
enableLineMaps();
enableJumps(() => lenis);

if (html.classList.contains('is-intro') && start === 'home') {
  const platform = document.getElementById('platform');
  bar.inert = true;
  car.inert = true;
  fitNames(platform);
  const [wallGlass] = glassFor(platform, { assemble: true });
  arrive('home');
  intro = runIntro({
    glass: wallGlass,
    onBoarded: () => {
      intro = null;
      bar.inert = false;
      car.inert = false;
      dropGlass(platform);
      platform.remove();
      if (current === 'home') { arrive('home'); greet(); }
      paintBar();
    },
    onSkip: () => document.querySelector('.greet')?.focus({ preventScroll: true }),
  });
} else {
  html.classList.remove('is-intro');
  document.getElementById('platform')?.remove();
  setStation(start);
  arrive(start, { assemble: true });
  revealHero(start);
}

/* ---------------- Secret door: type "olivia" anywhere ---------------- */
let typed = '';
window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea')) return;
  typed = (typed + (e.key || '')).toLowerCase().slice(-6);
  if (typed === 'olivia') { typed = ''; go('shrine'); }
});
