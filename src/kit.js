// SVG drawings of the TTC's own things, in one flat graphic language.
// Units are arbitrary; every drawing scales from its viewBox.

const C = {
  steel: '#cdd1d5', steel2: '#bfc4c8', roof: '#b3b8bd', leaf: '#bcc1c6', glass: '#1f2529', glass2: '#2c3338',
  under: '#2a2c2f', truck: '#1d1e20', wheel: '#0f0f10', interior: '#e9e6dc', back: '#d9d5c9', floor: '#6f6a62',
  pole: '#f3c300', red: '#da251d', white: '#ffffff', black: '#16181a', amber: '#ffb400',
};

/* ---------------- Toronto Rocket subway train ---------------- */
export const TRAIN = { carW: 2000, gap: 30, cab: 178, H: 340, doors: [270, 760, 1240, 1730], doorW: 170 };

function trainCar(n) {
  const { carW, doors, doorW } = TRAIN;
  const half = doorW / 2;
  const wins = [[34, 120], [404, 236], [884, 236], [1364, 236], [1846, 120]];
  let s = `<rect x="0" y="24" width="${carW}" height="268" rx="16" fill="${C.steel}"/>`;
  s += `<rect x="0" y="24" width="${carW}" height="18" rx="8" fill="${C.roof}"/>`;
  s += `<rect x="0" y="252" width="${carW}" height="40" fill="${C.steel2}"/>`;
  for (const [x, w] of wins) {
    s += `<rect x="${x}" y="86" width="${w}" height="104" rx="14" fill="${C.glass}"/>`;
    s += `<rect x="${x}" y="150" width="${w}" height="40" fill="${C.glass2}"/>`;
    s += `<path d="M${x + w * 0.18} 86h${w * 0.16}l-${w * 0.22} 104h-${w * 0.16}z" fill="#fff" fill-opacity=".07"/>`;
  }
  for (const c of doors) {
    s += `<rect x="${c - half - 7}" y="50" width="${doorW + 14}" height="242" fill="#9ea4aa"/>`;
    s += `<g class="doorway"><rect x="${c - half}" y="56" width="${doorW}" height="236" fill="${C.interior}"/>`;
    s += `<rect x="${c - half}" y="86" width="${doorW}" height="96" fill="${C.back}"/>`;
    s += `<rect x="${c - half}" y="262" width="${doorW}" height="30" fill="${C.floor}"/>`;
    s += `<rect x="${c - 5}" y="56" width="10" height="206" fill="${C.pole}"/></g>`;
    for (const side of ['l', 'r']) {
      const x0 = side === 'l' ? c - half : c;
      const winX = side === 'l' ? x0 + 16 : x0 + 20;
      const edgeX = side === 'l' ? c - 6 : c;
      s += `<g class="d${side}"><rect x="${x0}" y="56" width="${half}" height="236" fill="${C.leaf}"/>`;
      s += `<rect x="${winX}" y="80" width="${half - 36}" height="122" rx="10" fill="${C.glass}"/>`;
      s += `<rect x="${edgeX}" y="56" width="6" height="236" fill="#2a2d30"/>`;
      s += `<rect x="${winX}" y="222" width="${half - 36}" height="12" fill="${C.pole}"/></g>`;
    }
  }
  s += `<text x="40" y="236" fill="${C.red}" font-family="Jost Variable, Jost, sans-serif" font-weight="700" font-size="24">${5371 + n}</text>`;
  s += `<text x="1000" y="238" fill="${C.red}" font-family="Jost Variable, Jost, sans-serif" font-weight="700" font-size="30" text-anchor="middle" font-style="italic">TTC</text>`;
  s += `<rect x="0" y="292" width="${carW}" height="22" fill="${C.under}"/>`;
  for (const tx of [170, 1590]) {
    s += `<rect x="${tx}" y="296" width="240" height="36" rx="6" fill="${C.truck}"/>`;
    for (const wx of [tx + 52, tx + 188]) s += `<circle cx="${wx}" cy="318" r="21" fill="${C.wheel}"/><circle cx="${wx}" cy="318" r="7" fill="#555"/>`;
  }
  return s;
}

function cab(front) {
  // drawn for the front (pointing right); mirrored for the tail
  let s = `<path d="M0 24h86c46 0 80 40 88 92l4 176H0z" fill="${C.black}"/>`;
  s += `<path d="M12 44h70c26 0 50 22 58 56l2 46H12z" fill="#2a3036"/>`;
  s += `<rect x="18" y="52" width="104" height="26" fill="#050505"/>`;
  s += `<text x="70" y="71" fill="${C.amber}" font-family="Jost Variable, Jost, sans-serif" font-weight="600" font-size="17" text-anchor="middle">LIAM VU</text>`;
  s += `<circle class="${front ? 'lamp' : 'tail'}" cx="150" cy="246" r="12" fill="${front ? '#fff6c8' : '#ff3b30'}"/>`;
  s += `<circle cx="118" cy="246" r="8" fill="${front ? '#fff6c8' : '#ff3b30'}" fill-opacity=".8"/>`;
  s += `<rect x="0" y="292" width="150" height="22" fill="${C.under}"/>`;
  return s;
}

export function trainSVG(cars = 4) {
  const { carW, gap, cab: cw, H } = TRAIN;
  const W = cw * 2 + cars * carW + (cars - 1) * gap;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMax meet" aria-hidden="true" focusable="false">`;
  s += `<g transform="translate(${cw} 0) scale(-1 1)">${cab(false)}</g>`;
  for (let i = 0; i < cars; i++) {
    const x = cw + i * (carW + gap);
    if (i > 0) s += `<rect x="${x - gap}" y="40" width="${gap}" height="246" fill="${C.truck}"/>`;
    s += `<g class="tr-car" transform="translate(${x} 0)">${trainCar(i)}</g>`;
  }
  s += `<g transform="translate(${W - cw} 0)">${cab(true)}</g>`;
  return s + '</svg>';
}

/** x of a given door centre, in train units */
export function doorX(car, door) {
  return TRAIN.cab + car * (TRAIN.carW + TRAIN.gap) + TRAIN.doors[door];
}
export function trainWidth(cars = 4) {
  return TRAIN.cab * 2 + cars * TRAIN.carW + (cars - 1) * TRAIN.gap;
}

/* ---------------- Flexity streetcar ---------------- */
export const STREETCAR = { L: 3000, H: 430, doors: [470, 1090, 1910, 2530], doorW: 156 };

export function streetcarSVG(sign = 'LIAM VU LINE') {
  const { L, H, doors, doorW } = STREETCAR;
  const half = doorW / 2;
  const P = 120; // room for the noses
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-P} 0 ${L + P * 2} ${H}" preserveAspectRatio="xMinYMax meet" aria-hidden="true" focusable="false">`;
  // pantograph
  s += `<g fill="none" stroke="#2b2b2b" stroke-width="7" stroke-linejoin="round"><path d="M1380 70 1460 24 1560 70M1400 70 1480 24h120"/><path d="M1440 22h200" stroke-width="9"/></g>`;
  s += `<rect x="1360" y="62" width="220" height="14" fill="#3a3a3a"/>`;
  // body with noses
  s += `<path d="M0 74H${L}c60 0 96 40 104 100l8 206H-112l8-206C-96 114-60 74 0 74z" fill="${C.red}"/>`;
  s += `<rect x="-100" y="112" width="${L + 200}" height="16" fill="${C.white}"/>`;
  s += `<path d="M-104 128H${L + 104}l6 128H-110z" fill="${C.black}"/>`;
  s += `<rect x="-110" y="256" width="${L + 220}" height="16" fill="${C.white}"/>`;
  s += `<rect x="-112" y="372" width="${L + 224}" height="14" fill="#1a1a1a"/>`;
  // window mullions
  for (let x = 120; x < L; x += 190) s += `<rect x="${x}" y="128" width="12" height="128" fill="#2a2e32"/>`;
  // articulation joints
  for (const jx of [760, 1400, 1640, 2240]) s += `<rect x="${jx - 14}" y="80" width="28" height="296" fill="#262729"/>`;
  // doors
  for (const c of doors) {
    s += `<rect x="${c - half - 8}" y="124" width="${doorW + 16}" height="252" fill="#3b3e42"/>`;
    s += `<g class="doorway"><rect x="${c - half}" y="128" width="${doorW}" height="248" fill="${C.interior}"/>`;
    s += `<rect x="${c - half}" y="150" width="${doorW}" height="90" fill="${C.back}"/>`;
    s += `<rect x="${c - half}" y="346" width="${doorW}" height="30" fill="${C.floor}"/>`;
    s += `<rect x="${c - 5}" y="128" width="10" height="218" fill="${C.pole}"/></g>`;
    for (const side of ['l', 'r']) {
      const x0 = side === 'l' ? c - half : c;
      s += `<g class="d${side}"><rect x="${x0}" y="128" width="${half}" height="248" fill="#24282c"/>`;
      s += `<rect x="${x0 + 12}" y="142" width="${half - 24}" height="190" rx="6" fill="#101316"/>`;
      s += `<rect x="${x0}" y="340" width="${half}" height="36" fill="${C.red}"/></g>`;
    }
  }
  s += `<text x="1520" y="334" fill="${C.white}" font-family="Jost Variable, Jost, sans-serif" font-weight="700" font-size="40" font-style="italic" text-anchor="middle">TTC</text>`;
  // front windshield and sign (right end)
  s += `<path d="M${L - 30} 128h96c20 0 34 10 40 30l8 98H${L - 30}z" fill="#0d0f11"/>`;
  s += `<rect x="${L - 20}" y="86" width="120" height="22" fill="#050505"/>`;
  s += `<text x="${L + 40}" y="103" fill="${C.amber}" font-family="Jost Variable, Jost, sans-serif" font-weight="600" font-size="15" text-anchor="middle" class="sc-sign">${sign}</text>`;
  s += `<circle cx="${L + 82}" cy="318" r="12" fill="#fff6c8"/>`;
  // rear windshield
  s += `<path d="M30 128h-96c-20 0-34 10-40 30l-8 98H30z" fill="#0d0f11"/>`;
  s += `<circle cx="-82" cy="318" r="12" fill="#ff3b30"/>`;
  // bogies
  for (const bx of [260, 1520, 2740]) {
    s += `<rect x="${bx - 130}" y="380" width="260" height="34" rx="6" fill="${C.truck}"/>`;
    for (const wx of [bx - 70, bx + 70]) s += `<circle cx="${wx}" cy="408" r="19" fill="${C.wheel}"/>`;
  }
  return s + '</svg>';
}
export function streetcarDoorX(i = 1) {
  return 120 + STREETCAR.doors[i];
}
export function streetcarWidth() {
  return STREETCAR.L + 240;
}

/* ---------------- Cyclist (legs are posed per frame) ---------------- */
export const BIKE = { B: [118, 165], R: [60, 165], F: [205, 165], hip: [104, 86], crank: 22, thigh: 54, shin: 52 };

export function cyclistSVG() {
  const { R, F, B } = BIKE;
  const spokes = (cx, cy) => `<g class="spokes" style="transform-origin:${cx}px ${cy}px">` +
    [0, 45, 90, 135].map((a) => `<line x1="${cx}" y1="${cy - 42}" x2="${cx}" y2="${cy + 42}" transform="rotate(${a} ${cx} ${cy})"/>`).join('') + '</g>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 220" aria-hidden="true" focusable="false">
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g stroke="#111" stroke-width="7"><circle cx="${R[0]}" cy="${R[1]}" r="46"/><circle cx="${F[0]}" cy="${F[1]}" r="46"/></g>
      <g stroke="#111" stroke-width="2.5">${spokes(R[0], R[1])}${spokes(F[0], F[1])}</g>
      <path class="leg-far" stroke="#3a3a3a" stroke-width="12" d=""/>
      <g stroke="#f4f4f1" stroke-width="8"><path d="M${R[0]} ${R[1]} ${B[0]} ${B[1]} 100 96 ${R[0]} ${R[1]}"/><path d="M100 96 182 100 ${B[0]} ${B[1]}"/><path d="M182 100 ${F[0]} ${F[1]}"/></g>
      <path stroke="#111" stroke-width="7" d="M88 90h26M176 84l6 16M170 80h18"/>
      <g class="crank-g"><path class="crank" stroke="#555" stroke-width="6" d=""/></g>
      <path stroke="#da251d" stroke-width="28" d="M106 82 148 46"/>
      <path stroke="#da251d" stroke-width="10" d="M150 50 178 82"/>
      <path class="leg-near" stroke="#2a2a2a" stroke-width="14" d=""/>
    </g>
    <circle cx="166" cy="30" r="15" fill="#e8b48f"/>
    <path d="M148 28c0-14 10-22 20-22s19 7 19 17z" fill="#ffc72c"/>
  </svg>`;
}

/** Two-link leg from hip to pedal; returns an SVG path */
function legPath(angle) {
  const { B, hip, crank, thigh, shin } = BIKE;
  const fx = B[0] + crank * Math.cos(angle), fy = B[1] + crank * Math.sin(angle);
  const dx = fx - hip[0], dy = fy - hip[1];
  const d = Math.min(Math.hypot(dx, dy), thigh + shin - 0.01);
  const a = (thigh * thigh - shin * shin + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(thigh * thigh - a * a, 0));
  const mx = hip[0] + (a * dx) / d, my = hip[1] + (a * dy) / d;
  const kx = mx + (h * dy) / d, ky = my - (h * dx) / d; // knee forward
  return { leg: `M${hip[0]} ${hip[1]} ${kx.toFixed(1)} ${ky.toFixed(1)} ${fx.toFixed(1)} ${fy.toFixed(1)}`, fx, fy };
}
export function poseCyclist(svg, angle) {
  const near = legPath(angle), far = legPath(angle + Math.PI);
  svg.querySelector('.leg-near').setAttribute('d', near.leg);
  svg.querySelector('.leg-far').setAttribute('d', far.leg);
  svg.querySelector('.crank').setAttribute('d', `M${far.fx} ${far.fy} ${near.fx} ${near.fy}`);
  const deg = (angle * 180) / Math.PI;
  svg.querySelectorAll('.spokes').forEach((g) => (g.style.transform = `rotate(${deg * 1.6}deg)`));
}

/* ---------------- TTC stop pole ---------------- */
export function stopPoleSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 600" aria-hidden="true" focusable="false">
    <rect x="54" y="120" width="12" height="480" fill="#7d8287"/>
    <rect x="54" y="330" width="12" height="26" fill="#da251d"/><rect x="54" y="372" width="12" height="26" fill="#da251d"/>
    <rect x="8" y="8" width="104" height="132" fill="#fff"/>
    <rect x="8" y="8" width="104" height="40" fill="#da251d"/>
    <text x="60" y="38" fill="#fff" font-family="Jost Variable, Jost, sans-serif" font-weight="700" font-size="26" font-style="italic" text-anchor="middle">TTC</text>
    <g transform="translate(34 58) scale(1.6)" fill="#da251d"><path d="M15 2h2v3h-2zM11 2h10v2H11z"/><rect x="5" y="6" width="22" height="18" rx="4"/><rect x="8" y="9" width="16" height="7" rx="1.5" fill="#fff"/><path d="M9 24l-3 5h3l2-3h10l2 3h3l-3-5z"/></g>
  </svg>`;
}

/* ---------------- Toronto skyline over a main street ---------------- */
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
export function skylineSVG(seed = 7) {
  const r = rng(seed);
  const W = 1600, H = 400;
  let back = '', front = '', wins = '';
  for (let x = -20; x < W; ) {
    const w = 46 + r() * 90, h = 120 + r() * 190;
    if (!(x > 1060 && x < 1200)) back += `<rect x="${x.toFixed(0)}" y="${(H - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}"/>`;
    x += w + 6 + r() * 24;
  }
  // CN Tower
  back += `<path d="M1128 400 1138 120h14l10 280z"/><ellipse cx="1145" cy="128" rx="26" ry="11"/><rect x="1136" y="94" width="18" height="30"/><rect x="1142" y="12" width="6" height="84"/>`;
  for (let x = -10; x < W; ) {
    const w = 90 + r() * 120, h = 70 + r() * 70;
    const y = H - h;
    front += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}"/>`;
    const cols = Math.max(2, Math.floor(w / 34));
    for (let row = 0; row < 2; row++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + 12 + c * ((w - 24) / cols), wy = y + 14 + row * 30;
        if (wy + 18 < H - 34) wins += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="${((w - 24) / cols - 10).toFixed(0)}" height="18"/>`;
      }
    }
    wins += `<rect x="${(x + 10).toFixed(0)}" y="${H - 34}" width="${(w - 20).toFixed(0)}" height="34"/>`;
    x += w + 4;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <g fill="var(--bldg-3)">${back}</g><g fill="var(--bldg-1)">${front}</g><g fill="var(--bldg-2)">${wins}</g></svg>`;
}
