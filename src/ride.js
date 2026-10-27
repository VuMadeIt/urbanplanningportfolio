import gsap from 'gsap';
import { stations } from './data.js';
import { streetcarSVG, streetcarDoorX, streetcarWidth, STREETCAR, cyclistSVG, poseCyclist, skylineSVG, stopPoleSVG } from './kit.js';
import { chimeClose, chimeOpen, gong, bell, say, rideSound } from './audio.js';
import { reduced } from './content.js';

const DOORS = { shrine: 'doors-right', home: 'doors-right', social: 'doors-right', art: 'doors-left', about: 'doors-left', contact: 'doors-left' };
let firstRide = true;

const byId = Object.fromEntries(stations.map((s) => [s.id, s]));
const order = stations.filter((s) => !s.hidden).map((s) => s.id);
const layer = () => document.getElementById('ride');

let active = null; // the running timeline
let target = null;

export function isRiding() { return !!active; }
export function skipRide() { if (active) active.progress(1); }
export function ridingTo() { return active ? target : null; }

/**
 * Carry the visitor from one station to another.
 * swap() switches the page underneath while the vehicle covers the screen.
 * reveal() runs as the new station comes into view.
 */
export function ride(fromId, toId, { swap, reveal, speed = 1 }) {
  const to = byId[toId], from = byId[fromId] || byId.home;
  target = toId;
  if (reduced.matches) return fade(to, swap, reveal);
  const kind = to.mode;
  const run = kind === 'bike' ? bikeRide : kind === 'streetcar' ? streetcarRide : subwayRide;
  const tl = run(from, to, swap, reveal);
  tl.timeScale(speed);
  return tl;
}

function begin(html, cls) {
  const el = layer();
  el.className = `ride is-on ${cls}`;
  el.innerHTML = html;
  const t0 = performance.now();
  // a second click of a double click should not throw the ride away
  const onSkip = (e) => {
    if (e.type === 'click' && performance.now() - t0 < 650) return;
    if (e.type === 'click' || e.key === 'Escape') skipRide();
  };
  el.addEventListener('click', onSkip);
  window.addEventListener('keydown', onSkip);
  return { el, end: () => {
    el.removeEventListener('click', onSkip);
    window.removeEventListener('keydown', onSkip);
    el.className = 'ride';
    el.innerHTML = '';
    active = null;
    target = null;
  } };
}

/* ------------------------------------------------------------------ */
/* Reduced motion: a plain crossfade through the station's colour       */
/* ------------------------------------------------------------------ */
function fade(to, swap, reveal) {
  const { el, end } = begin(`<div class="ride-fade" style="background:${to.wall}"></div>`, 'ride--fade');
  const f = el.firstChild;
  active = gsap.timeline({ onComplete: end })
    .fromTo(f, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'none' })
    .call(swap)
    .to(f, { opacity: 0, duration: 0.3, ease: 'none' })
    .call(() => reveal?.());
  return active;
}

/* ------------------------------------------------------------------ */
/* Subway: you are inside the car. Doors close, tunnel, doors open.     */
/* ------------------------------------------------------------------ */
function leafSVG(side) {
  const W = Math.ceil(window.innerWidth / 2) + 1, H = window.innerHeight;
  const hw = Math.max(70, W * 0.4), hh = H * 0.44, hy = H * 0.15;
  const hx = side === 'l' ? W - hw - W * 0.2 : W * 0.2;
  const r = Math.min(30, hw * 0.16);
  const hole = `M${hx + r} ${hy}H${hx + hw - r}A${r} ${r} 0 0 1 ${hx + hw} ${hy + r}V${hy + hh - r}A${r} ${r} 0 0 1 ${hx + hw - r} ${hy + hh}H${hx + r}A${r} ${r} 0 0 1 ${hx} ${hy + hh - r}V${hy + r}A${r} ${r} 0 0 1 ${hx + r} ${hy}Z`;
  const edge = side === 'l' ? `<rect x="${W - 18}" y="0" width="18" height="${H}" fill="#202326"/>` : `<rect x="0" y="0" width="18" height="${H}" fill="#202326"/>`;
  const pocket = side === 'l' ? `<rect x="0" y="0" width="${W * 0.08}" height="${H}" fill="#b1b6bb"/>` : `<rect x="${W * 0.92}" y="0" width="${W * 0.08}" height="${H}" fill="#b1b6bb"/>`;
  const sy = hy + hh + H * 0.06;
  const words = hw < 190 ? 'Stand clear' : 'Please stand clear of the doors';
  const fs = Math.min(16, (hw * 0.86) / (words.length * 0.52));
  const stripe = `<rect x="${hx}" y="${sy}" width="${hw}" height="${Math.max(30, H * 0.045)}" fill="#ffc72c"/>
    <text x="${hx + hw / 2}" y="${sy + Math.max(30, H * 0.045) / 2 + fs * 0.34}" text-anchor="middle" font-family="Jost Variable, Jost, sans-serif" font-weight="600" font-size="${fs.toFixed(1)}" fill="#121212">${words}</text>`;
  return `<svg class="ride-leaf ride-leaf--${side}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 0H${W}V${H}H0Z${hole}" fill="#c3c8cd" fill-rule="evenodd"/>
    ${pocket}
    <path d="${hole}" fill="none" stroke="#2a2d30" stroke-width="14"/>
    ${edge}${stripe}
  </svg>`;
}

function stationWall(s, cls) {
  return `<div class="rs-wall ${cls}" style="--wall:${s.wall};--trim:${s.trim || s.ink};--name:${s.ink}"><span>${s.name}</span></div>`;
}

function lineMap(fromId, toId) {
  return `<ol class="ride-map">${order.map((id) => `<li class="${id === toId ? 'is-to' : ''}${id === fromId ? ' is-from' : ''}"><span>${byId[id].name}</span></li>`).join('')}</ol>`;
}

function subwayRide(from, to, swap, reveal) {
  const lights = Array.from({ length: 22 }, (_, i) => `<i style="left:${100 + i * 18.5}vw"></i>`).join('');
  const { el, end } = begin(`
    <div class="ride-out"><div class="ride-strip">
      ${stationWall(from, 'rs-from')}
      <div class="rs-tunnel">${lights}<b></b><b></b><b></b></div>
      ${stationWall(to, 'rs-to')}
    </div></div>
    <div class="ride-doors">${leafSVG('l')}${leafSVG('r')}</div>
    <div class="ride-top">
      <p class="ride-led"><span class="ride-led-a">${to.hidden ? 'Unscheduled stop' : 'Next station'}</span> <span class="ride-led-b">${to.name}</span></p>
      ${lineMap(from.id, to.id)}
    </div>`, 'ride--subway');

  const out = el.querySelector('.ride-out');
  const strip = el.querySelector('.ride-strip');
  const doors = el.querySelector('.ride-doors');
  const L = el.querySelector('.ride-leaf--l'), R = el.querySelector('.ride-leaf--r');
  const top = el.querySelector('.ride-top');
  const vw = window.innerWidth;
  const dist = strip.scrollWidth - vw;
  const marker = el.querySelector('.ride-map .is-to');

  const announce = firstRide ? ['stand-clear', `next-${to.id}`] : [`next-${to.id}`];
  firstRide = false;
  active = gsap.timeline({ onComplete: end })
    .call(() => { chimeClose(); say(announce); })
    .set(out, { opacity: 0 })
    .fromTo(top, { yPercent: -100 }, { yPercent: 0, duration: 0.5, ease: 'expo.out' }, 0.1)
    .fromTo(L, { xPercent: -100 }, { xPercent: 0, duration: 0.62, ease: 'power3.inOut' }, 0.3)
    .fromTo(R, { xPercent: 100 }, { xPercent: 0, duration: 0.62, ease: 'power3.inOut' }, 0.3)
    .to(doors, { x: 3, duration: 0.06, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0.92)
    .set(out, { opacity: 1 }, 0.92)
    .call(() => rideSound(2.2 / (active?.timeScale() || 1)), null, 0.95)
    .fromTo(strip, { x: 0 }, { x: -dist, duration: 1.8, ease: 'power2.inOut' }, 0.95)
    .to(doors, { y: 2.5, rotation: 0.12, duration: 0.16, yoyo: true, repeat: 9, ease: 'sine.inOut' }, 1.0)
    .fromTo(marker || document.createElement('i'), { '--fill': 0 }, { '--fill': 1, duration: 1.8, ease: 'power2.inOut' }, 0.95)
    .to(doors, { x: -6, duration: 0.18, yoyo: true, repeat: 1, ease: 'sine.out' }, 2.72)
    .call(() => { swap(); el.querySelector('.ride-led-a').textContent = 'Arriving at'; }, null, 2.78)
    .call(() => { chimeOpen(); say([`arriving-${to.id}`, DOORS[to.id] || 'doors-right'], { queue: true }); }, null, 2.9)
    .to(out, { opacity: 0, duration: 0.15, ease: 'none' }, 3.0)
    .to(L, { xPercent: -100, duration: 0.65, ease: 'power3.inOut' }, 3.0)
    .to(R, { xPercent: 100, duration: 0.65, ease: 'power3.inOut' }, 3.0)
    .call(() => reveal?.(), null, 3.1)
    .to(top, { yPercent: -100, duration: 0.4, ease: 'power2.in' }, 3.25);
  return active;
}

/* ------------------------------------------------------------------ */
/* Streetcar: you step out to the stop. The streetcar pulls in.         */
/* ------------------------------------------------------------------ */
function streetcarRide(from, to, swap, reveal) {
  const art = to.id === 'art';
  const { el, end } = begin(`
    <div class="rst ${art ? 'rst--paper' : ''}">
      <div class="rst-skyline">${skylineSVG(21)}</div>
      <div class="rst-road"><span></span><span></span></div>
      <div class="rst-car">${streetcarSVG((to.name + ' ').toUpperCase() + '504')}</div>
      <div class="rst-walk"></div>
      <div class="rst-pole">${stopPoleSVG()}</div>
      <p class="rst-sign"><span>Next streetcar</span> <strong>${to.name}</strong></p>
    </div>`, 'ride--street');

  const scene = el.querySelector('.rst');
  const carEl = el.querySelector('.rst-car');
  const sky = el.querySelector('.rst-skyline');
  const svg = carEl.querySelector('svg');
  const h = carEl.getBoundingClientRect().height;
  const s = h / STREETCAR.H;
  const w = streetcarWidth() * s;
  const stopX = window.innerWidth * 0.42 - streetcarDoorX(1) * s;

  active = gsap.timeline({ onComplete: end })
    .fromTo(scene, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: 'power3.inOut' })
    .call(() => { gong(); say(['next-projects'], { delay: 0.7 }); }, null, 0.35)
    .fromTo(carEl, { x: -w }, { x: stopX, duration: 1.75, ease: 'power3.out' }, 0.35)
    .fromTo(sky, { x: 0 }, { x: -window.innerWidth * 0.04, duration: 1.75, ease: 'power3.out' }, 0.35)
    .to(carEl, { x: stopX + 5 * s, duration: 0.18, yoyo: true, repeat: 1, ease: 'sine.out' })
    .to(svg.querySelectorAll('.dl'), { x: -70, duration: 0.5, ease: 'power2.inOut' }, '+=0.05')
    .to(svg.querySelectorAll('.dr'), { x: 70, duration: 0.5, ease: 'power2.inOut' }, '<')
    .call(swap)
    .add(() => {
      const r = carEl.getBoundingClientRect();
      const ox = r.left + streetcarDoorX(1) * s;
      const oy = r.top + 252 * s;
      gsap.set(scene, { transformOrigin: `${ox}px ${oy}px` });
    })
    .to(scene, { scale: 10, duration: 0.75, ease: 'power3.in' })
    .call(() => reveal?.(), null, '-=0.1')
    .to(el, { opacity: 0, duration: 0.14, ease: 'none' }, '-=0.08')
    .set(el, { opacity: 1 });
  return active;
}

/* ------------------------------------------------------------------ */
/* Bike lane: a green lane sweeps across, a rider pedals through.       */
/* ------------------------------------------------------------------ */
function bikeRide(from, to, swap, reveal) {
  const marks = Array.from({ length: 10 }, (_, i) => `<svg class="rbk-stencil" style="left:${i * 46}vw" viewBox="0 0 120 80" aria-hidden="true"><use href="#i-bike-stencil"/></svg>`).join('');
  const dashes = Array.from({ length: 40 }, (_, i) => `<i style="left:${i * 12}vw"></i>`).join('');
  const { el, end } = begin(`
    <div class="rbk">
      <div class="rbk-marks">${marks}<div class="rbk-dash">${dashes}</div></div>
      <span class="rbk-line rbk-line--t"></span><span class="rbk-line rbk-line--b"></span>
      <div class="rbk-rider">${cyclistSVG()}</div>
      <p class="rbk-sign">Bike lane to <strong>${to.name}</strong></p>
    </div>`, 'ride--bike');

  const lane = el.querySelector('.rbk');
  const marksEl = el.querySelector('.rbk-marks');
  const rider = el.querySelector('.rbk-rider');
  const svg = rider.querySelector('svg');
  let angle = 0, speed = 9;
  const pedal = (t, dt) => { angle += speed * (dt / 1000); poseCyclist(svg, angle); };
  poseCyclist(svg, 0);
  gsap.ticker.add(pedal);
  const vw = window.innerWidth;

  active = gsap.timeline({ onComplete: () => { gsap.ticker.remove(pedal); end(); } })
    .fromTo(lane, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: 'power3.inOut' })
    .call(() => { bell(); say(['next-case-studies'], { delay: 0.45 }); }, null, 0.3)
    .fromTo(marksEl, { x: 0 }, { x: -vw * 2.2, duration: 2.3, ease: 'power1.inOut' }, 0)
    .fromTo(rider, { x: -vw * 0.45 }, { x: vw * 0.5 - rider.offsetWidth / 2, duration: 0.85, ease: 'power3.out' }, 0.25)
    .call(swap, null, 1.15)
    .to(rider, { x: vw * 1.15, duration: 0.7, ease: 'power2.in', onStart: () => (speed = 14) }, 1.25)
    .to(lane, { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.6, ease: 'power3.inOut' }, 1.5)
    .call(() => reveal?.(), null, 1.6);
  return active;
}
