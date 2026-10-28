import gsap from 'gsap';
import { reduced } from './content.js';

// Live counts: public/stats.json is refreshed on a schedule (scripts/fetch-stats.mjs, run by the
// GitHub Action in .github/workflows/stats.yml). The page reads it on load and every few minutes,
// and rolls each number to its new value. Without the file, the numbers written in the HTML stay.
const POLL_MS = 5 * 60 * 1000;
let last = null;

const pick = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
const fmt = (n) => Number(n).toLocaleString('en-CA');

function setNumber(el, value) {
  if (value == null || Number.isNaN(Number(value))) return;
  const target = Math.round(Number(value));
  const current = Number(el.dataset.count ?? String(el.textContent).replace(/[^\d]/g, ''));
  el.dataset.count = target;
  // figures that have not counted up yet will count to the new value when they appear
  if (el.hasAttribute('data-count') && !el.dataset.counted) { el.textContent = fmt(target); return; }
  if (current === target) { el.textContent = fmt(target); return; }
  if (reduced.matches || !el.isConnected) { el.textContent = fmt(target); return; }
  const o = { v: current || 0 };
  gsap.to(o, { v: target, duration: 1.2, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(Math.round(o.v))) });
  el.classList.remove('is-ticked');
  void el.offsetWidth;
  el.classList.add('is-ticked');
}

function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} hour${h === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-CA', { month: 'long', day: 'numeric' });
}

function paintUpdated() {
  if (!last?.updated) return;
  document.querySelectorAll('[data-stats-updated]').forEach((el) => {
    el.textContent = `Live counts, updated ${ago(last.updated)}.`;
    el.closest('.figures-note')?.classList.add('is-live');
  });
}

/** Apply stats to every [data-stat] in the page (and to reel cards drawn later) */
export function applyStats(scope = document) {
  if (!last) return;
  scope.querySelectorAll('[data-stat]').forEach((el) => setNumber(el, pick(last, el.dataset.stat)));
  paintUpdated();
}

// The Action commits fresh counts to GitHub every 30 minutes; the copy deployed with the site is only as new as
// the last deploy. Read both and keep whichever was updated more recently.
const SOURCES = ['https://raw.githubusercontent.com/VuMadeIt/urbanplanningportfolio/main/public/stats.json', '/stats.json'];
const fetchStats = (url) => fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null)).then((d) => (d && typeof d === 'object' ? d : null)).catch(() => null);

async function load() {
  const found = (await Promise.all(SOURCES.map(fetchStats))).filter(Boolean);
  if (!found.length) return; // offline or no file: the numbers in the HTML stand
  last = found.sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0))[0];
  applyStats();
}

export function startLiveStats() {
  load();
  setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
  setInterval(paintUpdated, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
}
