import gsap from 'gsap';
import { trainSVG, doorX, trainWidth, TRAIN } from './kit.js';
import { chimeOpen, rumble } from './audio.js';

const CARS = 4;

/** Platform → train arrives, slows, stops → doors open → you step aboard. */
export function runIntro({ onBoarded, glass, onSkip }) {
  const html = document.documentElement;
  const platform = document.getElementById('platform');
  const trainEl = document.getElementById('train');
  const car = document.getElementById('car');
  const skip = document.getElementById('skip-intro');
  const arrivals = document.getElementById('arrivals-time');
  const streaks = platform.querySelector('.streaks');
  const wall = platform.querySelector('.wall');

  trainEl.innerHTML = trainSVG(CARS);
  const svg = trainEl.querySelector('svg');
  streaks.innerHTML = Array.from({ length: 16 }, (_, i) =>
    `<i style="top:${(i * 6.1 + (i % 3) * 2) % 96}%;width:${18 + ((i * 37) % 40)}vw;left:${(i * 29) % 90}vw"></i>`).join('');

  const geo = () => {
    const h = trainEl.getBoundingClientRect().height || window.innerHeight * 0.46;
    const s = h / TRAIN.H;
    const tw = trainWidth(CARS) * s;
    const stopX = window.innerWidth / 2 - doorX(1, 2) * s;
    return { s, tw, stopX };
  };
  let g = geo();

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

  const tl = gsap.timeline({ onComplete: finish });
  if (!glass) tl.from(platform.querySelectorAll('.wall-word'), { yPercent: 40, opacity: 0, duration: 0.9, stagger: 0.1, ease: 'expo.out' }, 0.05);
  tl.from(platform.querySelector('.wall-sign'), { opacity: 0, y: -12, duration: 0.6, ease: 'power3.out' }, 0.4)
    .from(platform.querySelector('.floor'), { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.3)
    .set(trainEl, { x: -g.tw }, 0)
    .to(platform.querySelector('.headlight'), { opacity: 0.75, duration: 1.1, ease: 'power2.in' }, 0.5)
    .call(() => { arrivals.textContent = 'Arriving'; }, null, 0.9)
    .call(() => rumble(5.4, 0.4), null, 0.7)
    .to(trainEl, { x: () => g.stopX, duration: 4.3, ease: 'power3.out', onUpdate: onMove }, 1.35)
    .to(platform.querySelector('.headlight'), { opacity: 0, duration: 0.5 }, 1.7)
    .set(streaks, { opacity: 0 })
    .to(trainEl, { x: () => g.stopX + 7 * g.s, duration: 0.22, ease: 'sine.out', yoyo: true, repeat: 1 })
    .call(() => { arrivals.textContent = 'Doors open'; chimeOpen(); }, null, '+=0.1')
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

  const onResize = () => { g = geo(); };
  window.addEventListener('resize', onResize);

  const skipNow = () => { if (!done) finish(); };
  const skipByHand = () => { if (!done) { finish(); onSkip?.(); } };
  skip.addEventListener('click', skipByHand);
  const onKey = (e) => { if (e.key === 'Escape' || (e.key === 'Enter' && document.activeElement === document.body)) skipByHand(); };
  window.addEventListener('keydown', onKey);
  skip.addEventListener('click', () => window.removeEventListener('keydown', onKey));

  return { skip: skipNow };
}
