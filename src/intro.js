import gsap from 'gsap';
import { trainSVG, doorX, trainWidth, TRAIN } from './kit.js';
import { chimeOpen, rideSound, say, sound } from './audio.js';

const CARS = 4;
const TRIM = 64;

/**
 * The waiting screen: the camera is up close on the Liam Vu wall, and the two ways to board are
 * slabs set into it, each the size of two tiles. Returns the zoom and where to hold it.
 */
function layTiles(platform, wall, glass) {
  const W = wall.offsetWidth;
  const H = Math.min(wall.offsetHeight, platform.querySelector('.track').offsetTop);
  // frame only the tiles, from under the trim down to the track, in whatever part of the platform is on screen
  const viewH = Math.min(window.innerHeight || platform.offsetHeight, platform.offsetHeight);
  const zoom = Math.max(1.05, viewH / (H - TRIM));
  const originY = (TRIM * zoom) / (zoom - 1);
  // how many tiles fit across the screen: narrow phones stack the two slabs (an odd count keeps
  // half tiles at both edges), wider screens set them side by side with a plain tile between (an even count)
  const side = W >= 520;
  const across = !side ? 5 : W < 1100 && W / viewH < 1.5 ? 6 : 8;
  const tw = W / zoom / across, th = tw / 2;
  // centre the grid on the wall: side by side, a tile sits on the centre line; stacked, a grout line does
  const offX = (((W / 2 - (side ? tw / 2 : 0)) % tw) + tw) % tw;
  const c = Math.round((W / 2 - offX - (side ? tw / 2 : 0)) / tw);
  const name = wall.querySelector('.wall-name');
  const firstFree = Math.ceil((name.offsetTop + name.offsetHeight - TRIM) / th) + 1;
  const bottom = Math.min(H, originY + (viewH - originY) / zoom);
  const lastRow = Math.floor((bottom - TRIM) / th) - 1;
  // stacked slabs keep a plain row between them when there is room
  const gapRows = side ? 0 : lastRow - firstFree >= 3 ? 2 : 1;
  const span = gapRows + 1;
  const row = Math.max(firstFree, firstFree + Math.floor((lastRow - firstFree + 1 - span) * 0.4));
  const cells = side ? [[c - 2, row], [c + 1, row]] : [[c - 1, row], [c - 1, row + gapRows]];
  const looks = [
    { colour: '#da251d', ink: '#ffffff', icon: 'sound' },
    { colour: '#1c1c1e', ink: '#f4f4f1', icon: 'quiet' },
  ];
  const btns = [...wall.querySelectorAll('.tile-btn')];
  wall.style.setProperty('--zoom', zoom.toFixed(3));
  btns.forEach((b, i) => {
    const [col, r] = cells[i];
    Object.assign(b.style, {
      left: `${offX + col * tw + 1.25}px`, top: `${TRIM + r * th + 1.25}px`,
      width: `${tw * 2 - 2.5}px`, height: `${th - 2.5}px`, fontSize: `${(th * 0.3).toFixed(1)}px`,
    });
  });
  if (glass) {
    glass.o.tile = th;
    glass.zoom = zoom;
    glass.setButtons(btns.map((b, i) => ({ col: cells[i][0], row: cells[i][1], label: b.textContent.trim(), ...looks[i] })), offX);
  }
  return { zoom, originY };
}

/** Platform → train arrives, slows, stops → doors open → you step aboard. */
export function runIntro({ onBoarded, glass, onSkip }) {
  const html = document.documentElement;
  const platform = document.getElementById('platform');
  const trainEl = document.getElementById('train');
  const car = document.getElementById('car');
  const arrivals = document.getElementById('arrivals-time');
  const streaks = platform.querySelector('.streaks');
  const wall = platform.querySelector('.wall');

  trainEl.innerHTML = trainSVG(CARS);
  const svg = trainEl.querySelector('svg');
  streaks.innerHTML = Array.from({ length: 16 }, (_, i) =>
    `<i style="top:${(i * 6.1 + (i % 3) * 2) % 96}%;width:${18 + ((i * 37) % 40)}vw;left:${(i * 29) % 90}vw"></i>`).join('');

  const geo = () => {
    const h = trainEl.offsetHeight || window.innerHeight * 0.46;
    const s = h / TRAIN.H;
    const tw = trainWidth(CARS) * s;
    const stopX = window.innerWidth / 2 - doorX(1, 2) * s;
    return { s, tw, stopX };
  };
  let g = geo();
  gsap.set(trainEl, { x: -g.tw });

  let lastX = -g.tw, lastT = performance.now();
  const onMove = () => {
    const now = performance.now();
    const x = gsap.getProperty(trainEl, 'x');
    const v = Math.abs(x - lastX) / Math.max(1, now - lastT) * 1000; // px per second
    lastX = x; lastT = now;
    const k = Math.min(1, v / 5000);
    streaks.style.opacity = (k * 0.9).toFixed(3);
    streaks.style.transform = `translateX(${(-x * 0.15) % 200}px)`;
    trainEl.style.setProperty('--shake', `${(Math.random() - 0.5) * 3 * k}px`);
    wall.style.transform = `translateY(${((Math.random() - 0.5) * 2.4 * k).toFixed(2)}px)`;
    // the headlight sweeps across the glass tiles as the train comes in
    if (glass) {
      const r = trainEl.getBoundingClientRect();
      glass.setLight(Math.min(r.right, window.innerWidth + 200), r.top + r.height * 0.4);
    }
  };

  let done = false;
  let boarding = false;
  // The train waits for you: browsers only allow sound after a click, so boarding is that click.
  const tools = platform.querySelector('.intro-tools');
  const btns = [...tools.querySelectorAll('.tile-btn')];
  const hold = () => {
    if (boarding || done) return;
    const { zoom, originY } = layTiles(platform, wall, glass);
    gsap.set(platform, { scale: zoom, transformOrigin: `50% ${originY}px` });
  };
  hold();
  document.fonts?.ready.then(hold);
  btns.forEach((b, i) => {
    const state = (s) => glass?.buttonState(i, s);
    b.addEventListener('pointerenter', () => state({ hover: 1 }));
    b.addEventListener('pointerleave', () => state({ hover: 0, press: 0 }));
    b.addEventListener('pointerdown', () => state({ press: 1 }));
    b.addEventListener('focus', () => state({ hover: 1 }));
    b.addEventListener('blur', () => state({ hover: 0 }));
    b.addEventListener('click', () => board(i === 0, i));
  });
  function board(withSound, i) {
    if (boarding || done) return;
    boarding = true;
    sound.set(withSound);
    tools.classList.add('is-gone');
    glass?.buttonState(i, { press: 1, hover: 0 });
    // the pressed slab springs back, both settle into the wall, then you step back to see the platform
    gsap.timeline()
      .call(() => glass?.buttonState(i, { press: 0 }), null, 0.22)
      .to(glass || {}, { gone: 1, duration: 0.6, ease: 'power2.inOut', onComplete: () => glass?.setButtons([], glass.offXCss) }, 0.22)
      .to(platform, { scale: 1, duration: 1.4, ease: 'power3.inOut', onComplete: () => { glass?.setZoom(1); tl.play(); } }, 0.5);
  }
  const finish = () => {
    if (done) return;
    done = true;
    tl.kill();
    gsap.killTweensOf([platform, car, trainEl]);
    platform.style.transform = '';
    platform.style.opacity = '';
    car.style.visibility = '';
    gsap.set(car, { clearProps: 'opacity,transform' });
    html.classList.remove('is-intro');
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    sessionStorage.setItem('lv-boarded', '1');
    onBoarded?.();
  };

  const tl = gsap.timeline({ onComplete: finish, paused: true });
  if (!glass) tl.from(platform.querySelectorAll('.wall-word'), { yPercent: 40, opacity: 0, duration: 0.9, stagger: 0.1, ease: 'expo.out' }, 0.05);
  tl.from(platform.querySelector('.wall-sign'), { opacity: 0, y: -12, duration: 0.6, ease: 'power3.out' }, 0.4)
    .from(platform.querySelector('.floor'), { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.3)
    .set(trainEl, { x: -g.tw }, 0)
    .to(platform.querySelector('.headlight'), { opacity: 0.75, duration: 1.1, ease: 'power2.in' }, 0.5)
    .call(() => { arrivals.textContent = 'Arriving'; }, null, 0.9)
    .call(() => rideSound(4.6, 1), null, 0.9)
    .to(trainEl, { x: () => g.stopX, duration: 4.3, ease: 'power3.out', onUpdate: onMove }, 1.35)
    .to(platform.querySelector('.headlight'), { opacity: 0, duration: 0.5 }, 1.7)
    .set(streaks, { opacity: 0 })
    .to(trainEl, { x: () => g.stopX + 7 * g.s, duration: 0.22, ease: 'sine.out', yoyo: true, repeat: 1 })
    .call(() => { arrivals.textContent = 'Doors open'; chimeOpen(); say(['welcome'], { delay: 0.45 }); }, null, '+=0.1')
    .to(svg.querySelectorAll('.dl'), { x: -80, duration: 0.85, ease: 'power2.inOut' }, '+=0.12')
    .to(svg.querySelectorAll('.dr'), { x: 80, duration: 0.85, ease: 'power2.inOut' }, '<')
    // step aboard: the camera walks into the open door in the middle of the screen
    .add(() => {
      const r = trainEl.getBoundingClientRect();
      const oy = r.top + ((56 + 292) / 2) * g.s;
      gsap.set(platform, { transformOrigin: `${window.innerWidth / 2}px ${oy}px` });
      car.style.visibility = 'visible';
      gsap.set(car, { opacity: 0, scale: 1.06 });
    }, '+=0.25')
    .to(platform, { scale: 7, duration: 1.15, ease: 'power3.in' })
    .to(platform, { opacity: 0, duration: 0.35, ease: 'power1.in' }, '-=0.4')
    .to(car, { opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' }, '-=0.45');

  const onResize = () => { g = geo(); hold(); };
  window.addEventListener('resize', onResize);

  const skipNow = () => { if (!done) finish(); };
  const skipByHand = () => { if (!done) { finish(); onSkip?.(); } };
  const onKey = (e) => { if (e.key === 'Escape' || (e.key === 'Enter' && document.activeElement === document.body)) skipByHand(); };
  window.addEventListener('keydown', onKey);


  return { skip: skipNow };
}
