import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { stations, reels, FEED_URL } from './data.js';
import { GlassWall } from './glass.js';
import { doricSVG, lotusSVG } from './kit.js';
import { reduced, loadIgScript } from './content.js';

gsap.registerPlugin(ScrollTrigger);
const byId = Object.fromEntries(stations.map((s) => [s.id, s]));

/* ---------------- Station signs: which real station the tiles come from ---------------- */
export function renderColumns() {
  document.querySelectorAll('.wall--art').forEach((wall) => {
    if (wall.querySelector('.columns')) return;
    const c = document.createElement('div');
    c.className = 'columns';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = `<span class="column column--lotus">${lotusSVG()}</span><span class="column column--doric">${doricSVG()}</span>`;
    wall.append(c);
  });
}

export function renderSigns() {
  document.querySelectorAll('[data-sign]').forEach((el) => {
    const id = el.closest('[data-glass]')?.dataset.glass;
    const s = byId[id];
    if (!s?.after) return;
    el.innerHTML = `<span class="sign-swatches" aria-hidden="true"><i style="background:${s.wall}"></i><i style="background:${s.trim}"></i></span>
      <span class="sign-text"><strong>Tiled after ${s.after}</strong><span>${s.tile} with ${s.trimName} trim</span></span>`;
  });
}

/* ---------------- Vitrolite walls ---------------- */
const walls = new Map();
let glassOK = null;
function supportsGL() {
  if (glassOK !== null) return glassOK;
  try { glassOK = !!document.createElement('canvas').getContext('webgl'); } catch { glassOK = false; }
  return glassOK;
}
export function glassFor(scope, { assemble = false } = {}) {
  if (!supportsGL()) return [];
  const made = [];
  scope.querySelectorAll('[data-glass]').forEach((wall) => {
    let g = walls.get(wall);
    if (!g) {
      const s = byId[wall.dataset.glass];
      g = new GlassWall(wall, { wall: s.wall, trimColour: s.trim, small: wall.closest('.platform') ? s.name : null, columns: false, trim: 64 });
      if (g.failed) return;
      g.still = reduced.matches;
      walls.set(wall, g);
    }
    g.resize();
    if (assemble && !reduced.matches) g.assemble(1.4);
    made.push(g);
  });
  return made;
}
export function refreshGlass(scope = document) {
  walls.forEach((g, wall) => { if (scope.contains(wall)) g.resize(); });
}
export function dropGlass(scope) {
  walls.forEach((g, wall) => { if (scope.contains(wall)) { g.destroy(); walls.delete(wall); } });
}
export function glassOf(wall) { return walls.get(wall); }

/* ---------------- Reel cards and the player ---------------- */
function reelCard(r) {
  const likes = r.likes ? `<span class="reel-likes"><span data-stat="reels.${r.code}.likes">${r.likes.toLocaleString('en-CA')}</span> likes</span>` : '';
  const series = r.series ? `<span class="reel-series">${r.series}</span>` : '';
  const cover = r.cover || `/media/reels/${r.code}.jpg`;
  return `<figure class="reel-card">
    <button class="reel-btn" type="button" data-play="${r.code}" data-title="${r.title.replace(/"/g, '&quot;')}" data-by="${r.by} · ${r.when}" aria-label="Play reel: ${r.title.replace(/"/g, '&quot;')}">
      <img src="${cover}" width="540" height="960" alt="" loading="lazy" decoding="async">${series}${likes}
      <span class="reel-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>
    </button>
    <figcaption><strong>${r.title}</strong><span>${r.by} · ${r.when}</span></figcaption>
  </figure>`;
}

async function liveReels() {
  if (!FEED_URL) return null;
  try {
    const data = await (await fetch(FEED_URL)).json();
    const posts = Array.isArray(data) ? data : data.posts || [];
    return posts.slice(0, 10).map((p) => {
      const m = String(p.permalink || '').match(/instagram\.com\/(?:p|reel|tv)\/([^/?#]+)/);
      if (!m) return null;
      return { code: m[1], cover: p.thumbnailUrl || p.mediaUrl, title: (p.caption || 'New reel').split('\n')[0].slice(0, 60), by: '@liamvutoronto', when: p.timestamp ? new Date(p.timestamp).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }) : '' };
    }).filter(Boolean);
  } catch { return null; }
}

export function keepFocusedInView() {
  document.addEventListener('focusin', (e) => {
    const card = e.target.closest?.('.reel-card');
    const track = card?.closest('.reel-track');
    if (!track) return;
    const t = track.getBoundingClientRect(), c = card.getBoundingClientRect();
    if (c.left < t.left || c.right > t.right) track.scrollBy({ left: c.left < t.left ? c.left - t.left - 8 : c.right - t.right + 8, behavior: reduced.matches ? 'auto' : 'smooth' });
  });
}

export function renderReels() {
  const track = document.querySelector('.reel-track');
  if (track) {
    track.innerHTML = reels.map(reelCard).join('');
    liveReels().then((live) => { if (live?.length) track.innerHTML = live.map(reelCard).join(''); });
  }
  document.querySelectorAll('[data-reel]').forEach((slot) => {
    const r = reels.find((x) => x.code === slot.dataset.reel);
    if (r) slot.innerHTML = reelCard(r);
  });
}

let dlg = null;
let pushed = false;
let getLenisRef = () => null;
/** Close the reel player. silent: the caller is already changing history, so leave it alone */
export function closePlayer({ silent = false } = {}) {
  if (!dlg?.open) return;
  if (silent) pushed = false;
  dlg.close();
}
export function enablePlayer(getLenis) {
  getLenisRef = getLenis;
  dlg = document.getElementById('player');
  const slot = dlg.querySelector('.player-slot');
  const meta = dlg.querySelector('.player-meta');
  let opener = null;
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-play]');
    if (!b || dlg.open || document.querySelector('#ride.is-on')) return;
    opener = b;
    const url = `https://www.instagram.com/reel/${b.dataset.play}/`;
    slot.innerHTML = `<blockquote class="instagram-media" data-instgrm-permalink="${url}?utm_source=ig_embed" data-instgrm-version="14" style="margin:0;width:100%;min-width:0;border:0;padding:0">
      <a class="ig-fallback" href="${url}" target="_blank" rel="noopener">Open this reel on Instagram<small>Loading the player…</small></a></blockquote>`;
    meta.innerHTML = `<strong>${b.dataset.title}</strong> · ${b.dataset.by} · <a class="link" href="${url}" target="_blank" rel="noopener">Open on Instagram</a>`;
    dlg.showModal();
    getLenisRef()?.stop();
    // Back closes the player instead of leaving the station
    history.pushState({ player: true }, '', location.href);
    pushed = true;
    const ig = await loadIgScript();
    if (dlg.open) ig?.Embeds?.process();
  });
  window.addEventListener('popstate', () => { if (dlg.open) { pushed = false; dlg.close(); } });
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
  dlg.addEventListener('close', () => {
    slot.innerHTML = '';
    getLenisRef()?.start();
    if (pushed) { pushed = false; history.back(); }
    if (opener?.isConnected && opener.offsetParent) opener.focus({ preventScroll: true });
  });
}

/* ---------------- Sketch first, then paint ---------------- */
// Two ways. A picture paints itself in from the edge you meet first: its top when you scroll down,
// its bottom when you scroll back up. When it slips off screen it washes back to pencil, ready to paint again.
const PAINT_AT = 0.18;   // share of the picture (or of the screen, for tall pictures) that must be showing
const ERASE_AT = 0.06;
const setState = (box, state, fromTop) => {
  box.classList.remove('is-waiting', 'is-painting', 'is-erasing', 'from-top');
  if (fromTop) box.classList.add('from-top');
  if (state) box.classList.add(state);
  box.dataset.ink = state || 'done';
};
const paintObserver = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const box = e.target;
    const state = box.dataset.ink;
    const root = e.rootBounds?.height || window.innerHeight;
    const showing = Math.max(e.intersectionRatio, e.intersectionRect.height / root);
    const above = e.boundingClientRect.top < (e.rootBounds?.top ?? 0); // the picture's top is above the screen
    if (!e.isIntersecting) {
      // fully off screen: back to pencil without anyone seeing the change
      if (state !== 'is-waiting') setState(box, 'is-waiting');
      continue;
    }
    if (showing >= PAINT_AT && (state === 'is-waiting' || state === 'is-erasing')) {
      // entering from above (scrolling up): paint from the bottom edge, the part that shows first
      setState(box, 'is-painting', above);
    } else if (showing < ERASE_AT && (state === 'done' || state === 'is-painting')) {
      // leaving: wash back to pencil, starting from the edge that is still in view
      setState(box, 'is-erasing', !above);
    }
  }
}, { rootMargin: '0px', threshold: [0, 0.03, ERASE_AT, 0.12, PAINT_AT, 0.3, 0.5] });

function onPaintEnd(e) {
  const box = e.currentTarget.parentElement;
  if (box.dataset.ink === 'is-painting') setState(box, null);
  else if (box.dataset.ink === 'is-erasing') setState(box, 'is-waiting');
}

export function enablePaint() {
  document.querySelectorAll('[data-paint]').forEach((fig) => {
    const media = fig.querySelector('img, video');
    if (!media || media.parentElement.classList.contains('paint-box')) return;
    const src = media.tagName === 'VIDEO' ? media.getAttribute('poster') : media.getAttribute('src');
    const name = fig.dataset.paint || src.split('/').pop().replace(/\.\w+$/, '');
    const box = document.createElement('span');
    box.className = 'paint-box';
    media.before(box);
    box.append(media);
    const sk = document.createElement('img');
    sk.className = 'paint-sketch';
    sk.src = `/media/sketch/${name}.jpg`;
    sk.alt = '';
    sk.loading = 'lazy';
    sk.decoding = 'async';
    sk.onerror = () => { sk.remove(); paintObserver.unobserve(box); setState(box, null); };
    box.prepend(sk);
    const pos = () => { sk.style.objectPosition = getComputedStyle(media).objectPosition; };
    pos();
    if (reduced.matches) return;
    setState(box, 'is-waiting');
    media.addEventListener('animationend', onPaintEnd);
    paintObserver.observe(box);
  });
}

/* ---------------- Line maps draw themselves as you ride past ---------------- */
/** End each line at its last stop's dot, like a terminus */
export function sizeLines(scope = document) {
  scope.querySelectorAll('.lm').forEach((list) => {
    const last = list.lastElementChild;
    if (!last || !list.offsetHeight) return;
    const dot = getComputedStyle(last, '::before');
    const top = last.offsetTop + parseFloat(dot.top || 0) + parseFloat(dot.height || 36) / 2;
    list.style.setProperty('--lm-bottom', `${Math.max(0, list.offsetHeight - top)}px`);
  });
}

export function enableLineMaps() {
  if (reduced.matches) return;
  document.querySelectorAll('.lm, .stoplist').forEach((list) => {
    const stops = [...list.children];
    gsap.fromTo(list, { '--draw': 0 }, {
      '--draw': 1, ease: 'none',
      scrollTrigger: {
        trigger: list, start: 'top 82%', end: 'bottom 62%', scrub: 0.6,
        onUpdate: (st) => {
          const n = Math.round(st.progress * stops.length + 0.4);
          stops.forEach((s, i) => s.classList.toggle('is-lit', i < n));
        },
      },
    });
  });
  document.querySelectorAll('.route-strip .lmh').forEach((strip) => {
    gsap.fromTo(strip, { '--draw': 0 }, { '--draw': 1, duration: 1.4, ease: 'power3.inOut', scrollTrigger: { trigger: strip, start: 'top 85%', once: true } });
  });
}

/* ---------------- Next-stop boards carry the whole line ---------------- */
export function renderNextMaps() {
  const order = stations.map((s) => s.id);
  document.querySelectorAll('.next-stop').forEach((board) => {
    const here = board.closest('.station')?.id;
    const next = board.querySelector('[data-ride]')?.dataset.ride;
    if (!here || board.querySelector('.next-map')) return;
    const mode = { subway: 'Subway', bike: 'Bike lane', streetcar: 'Streetcar' };
    const html = order.map((id) => {
      const s = byId[id];
      const cls = id === here ? 'is-here' : id === next ? 'is-next' : '';
      const small = id === here ? 'You are here' : id === next ? 'Next' : mode[s.mode];
      return `<li class="${cls}"><a href="${id === 'home' ? '#/' : `#/${id}`}" data-ride="${id}"><span>${s.name}</span><small>${small}</small></a></li>`;
    }).join('');
    const nav = document.createElement('div');
    nav.className = 'next-map';
    nav.innerHTML = `<ol class="lmh" aria-label="The whole line">${html}</ol>`;
    board.append(nav);
    // start the map at "you are here"
    requestAnimationFrame(() => {
      const hereEl = nav.querySelector('.is-here');
      if (hereEl) nav.scrollLeft = Math.max(0, hereEl.offsetLeft - 24);
    });
  });
}

/* ---------------- In-page jumps (the case study route) ---------------- */
export function enableJumps(getLenis) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-jump]');
    if (!a) return;
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'))?.closest('article') || document.querySelector(a.getAttribute('href'));
    if (!target) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { offset: -64, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
  });
}
