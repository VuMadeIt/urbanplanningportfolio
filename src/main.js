import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { stations } from './data.js';
import { runIntro } from './intro.js';
import { ride, isRiding, skipRide } from './ride.js';
import { sound } from './audio.js';
import {
  reduced, fitNames, drawStreets, splitRoadNames, fillTracks, wakeEmbeds, enableDrag, enableVideos,
  watchVideos, watchReveals, watchCounts, buildSeams, renderCredits,
} from './content.js';

gsap.registerPlugin(ScrollTrigger);

const html = document.documentElement;
const byId = Object.fromEntries(stations.map((s) => [s.id, s]));
const bar = document.getElementById('bar');
const announcer = document.getElementById('announcer');
const heroInk = { home: '#121212', social: '#ffffff', 'case-studies': '#ffffff', projects: '#f4f4f1', art: '#121212', about: '#121212', contact: '#ffffff' };

let current = 'home';
let lenis = null;

const idFromHash = () => {
  const h = location.hash.replace(/^#\/?/, '');
  return byId[h] ? h : 'home';
};

/* ---------------- Boot ---------------- */
drawStreets();
splitRoadNames();
fillTracks();
enableDrag();
enableVideos();
renderCredits();
watchReveals();
watchCounts();
watchVideos();

if (!reduced.matches) {
  lenis = new Lenis({ lerp: 0.12, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------------- Stations ---------------- */
function setStation(id) {
  document.querySelector('.station.is-current')?.classList.remove('is-current');
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
  return el;
}

function arrive(id) {
  const el = document.getElementById(id);
  fitNames(el);
  wakeEmbeds(el);
  watchHero(el);
  requestAnimationFrame(() => { ScrollTrigger.refresh(); lenis?.resize(); });
  announcer.textContent = id === 'home' ? 'Liam Vu station' : `Arriving at ${byId[id].name}`;
}

/* Hero entrances: each kind of stop arrives its own way */
function revealHero(id) {
  if (reduced.matches) return;
  const el = document.getElementById(id);
  const name = el.querySelector('.station-name');
  const tl = gsap.timeline();
  if (el.querySelector('.hero--subway')) {
    tl.from(name, { yPercent: 18, opacity: 0, duration: 1, ease: 'expo.out' })
      .from(el.querySelectorAll('.floor > *'), { y: 18, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.2);
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
  } else if (id === 'home') greet();
  name?.focus?.({ preventScroll: true });
}

function greet() {
  if (reduced.matches) return;
  const car = document.getElementById('car');
  gsap.timeline()
    .from(car.querySelectorAll('.greet [data-line]'), { yPercent: 105, duration: 0.9, stagger: 0.11, ease: 'expo.out' })
    .from(car.querySelectorAll('.greet-lead, .car-greeting .button'), { y: 16, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, 0.3)
        .from(car.querySelectorAll('.stoplist li'), { x: 28, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' }, 0.3)
    .from(car.querySelectorAll('.card'), { yPercent: 30, opacity: 0, duration: 0.8, stagger: 0.07, ease: 'expo.out' }, 0.35)
    .from(car.querySelector('.pole--left'), { scaleY: 0, transformOrigin: 'top', duration: 0.9, ease: 'expo.out' }, 0.1)
    .from(car.querySelector('.led-text'), { xPercent: 40, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0.25);
}

/* ---------------- The bar takes the colour of what is under it ---------------- */
let heroObserver = null;
function watchHero(station) {
  heroObserver?.disconnect();
  const hero = station.querySelector('.hero') || station.querySelector('#car .car-body');
  const set = (onHero) => {
    bar.classList.toggle('is-solid', !onHero);
    bar.style.setProperty('--bar-ink', onHero ? heroInk[current] : '');
  };
  set(true);
  heroObserver = new IntersectionObserver(([e]) => set(e.isIntersecting), {
    rootMargin: `0px 0px -${Math.max(0, window.innerHeight - 64)}px 0px`,
  });
  heroObserver.observe(hero);
}

/* ---------------- Riding between stations ---------------- */
function go(id, push = true) {
  if (isRiding()) skipRide();
  closeSheet();
  if (id === current) {
    lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
    return;
  }
  if (push) history.pushState({ id }, '', id === 'home' ? '#/' : `#/${id}`);
  const from = current;
  current = id;
  ride(from, id, {
    swap: () => { setStation(id); arrive(id); },
    reveal: () => revealHero(id),
  });
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-ride]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  go(a.dataset.ride);
});
window.addEventListener('hashchange', () => {
  const id = idFromHash();
  if (id !== current) go(id, false);
});

/* ---------------- Phone stops sheet ---------------- */
const sheet = document.getElementById('stops-sheet');
const sheetBtn = document.querySelector('.stops-toggle');
function closeSheet() {
  if (sheet.hidden) return;
  sheet.hidden = true;
  sheetBtn.setAttribute('aria-expanded', 'false');
  lenis?.start();
}
sheetBtn.addEventListener('click', () => {
  const open = sheet.hidden;
  sheet.hidden = !open;
  sheetBtn.setAttribute('aria-expanded', String(open));
  if (open) {
    lenis?.stop();
    gsap.from(sheet.querySelectorAll('li'), { x: -24, opacity: 0, duration: 0.45, stagger: 0.04, ease: 'power3.out' });
    sheet.querySelector('a')?.focus();
  }
});
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

/* ---------------- Sound toggle ---------------- */
const soundBtn = document.querySelector('[data-sound]');
const paintSound = () => {
  soundBtn.setAttribute('aria-pressed', String(sound.on));
  soundBtn.querySelector('.sound-label').textContent = sound.on ? 'Sound on' : 'Sound off';
};
soundBtn.addEventListener('click', () => { sound.set(!sound.on); paintSound(); });
paintSound();

/* ---------------- Resize ---------------- */
let rz;
window.addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => {
    fitNames(document.getElementById(current));
    if (html.classList.contains('is-intro')) fitNames(document.getElementById('platform'));
    watchHero(document.getElementById(current));
  }, 120);
});

/* ---------------- Start ---------------- */
const start = idFromHash();
document.fonts?.ready.then(() => fitNames(document.getElementById(current)));
buildSeams();

if (html.classList.contains('is-intro') && start === 'home') {
  fitNames(document.getElementById('platform'));
  arrive('home');
  runIntro({ onBoarded: () => { document.getElementById('platform')?.remove(); arrive('home'); greet(); } });
} else {
  html.classList.remove('is-intro');
  document.getElementById('platform')?.remove();
  setStation(start);
  arrive(start);
  revealHero(start);
}
