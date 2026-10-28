# Liam Vu portfolio: agent notes

A TTC-themed portfolio for Liam Vu (@liamvutoronto), "The Urban Planning Influencer".
Plain HTML/CSS/JS with Vite, GSAP 3.15 (ScrollTrigger) and Lenis. No framework.

## Commands
- `npm install`
- `npm run dev`: dev server on http://localhost:5173
- `npm run build` then `npm run preview`: production build in `dist/` (refreshes live counts first, never fails on them)
- `npm run stats`: refresh `public/stats.json` (live follower/like/view counts) by hand; `npm run build:offline` skips it
- `?nointro` skips the train intro; `#/social`, `#/case-studies`, `#/projects`, `#/art`, `#/about`, `#/contact` open a station directly

## Structure
- `index.html`: all page content (every station is a `<section class="station">`, only `.is-current` shows when JS runs; without JS they all show stacked)
- `src/main.js`: boot, hash router, Lenis, bar colour, hero entrances
- `src/intro.js`: platform intro (train arrives, doors open, camera boards). It waits zoomed in on the wall; the two
  boarding buttons (`.tile-btn`) live inside `#platform .wall` and `layTiles()` snaps them to the tile grid as 2x1 slabs that
  `glass.js` draws (`setButtons`, `buttonState`). Never position them against `#home`: that section is ~7,000px tall.
  Measure walls with `offsetWidth/Height`, not `getBoundingClientRect`, because the platform is scaled while waiting
- `src/ride.js`: transitions, chosen by the destination's mode: `subway` (inside the car: doors, tunnel), `streetcar` (stop, Flexity pulls in), `bike` (green lane, cyclist)
- `src/kit.js`: SVG drawings (Toronto Rocket, Flexity, cyclist, stop pole, skyline)
- `src/content.js`: Instagram embeds (lazy), YouTube facades, counters, seams, credits, fitted station names
- `src/data.js`: reels, art posts and the station list. Optional `FEED_URL` (Behold.so JSON) makes the reels update automatically
- `src/audio.js`: synthesized chimes, off by default
- `src/glass.js`: WebGL Vitrolite tile walls (per-tile refraction, bevel light, sheen). Palettes per station are the real
  1954/1963 TTC schemes in `src/data.js` (`after`, `tile`, `trimName`); CSS tiles are the fallback without WebGL
- `src/art.js`: station signs, Museum columns, reel cards + player dialog, sketch-to-paint reveals, line maps, next-stop maps
- Type: Jost = TTC signage (station names, places, nav, map stops); Fraunces = Liam's voice (greeting, section titles, quotes, labels)
- Art images come from Liam's Instagram posts (`/p/<code>/media/?size=l`), cropped to the work; raw downloads live in `.taste-skill/raw/` (not shipped)
- Pencil-sketch versions of photos are in `public/media/sketch/` (generated with PIL); `public/media/brush-reveal.png` is the brush mask sprite
- `public/media/`: downloaded photos and clips; `credits.json` records source and licence and feeds the credits list

## Design rules (taste-skill, in `.devin/skills/taste-skill`)
- One family (Jost Variable), five sizes, square buttons, no gradients, no shadows at rest, no eyebrows, no monospace
- Station names are each station's `h1`; section titles are `h2`
- Gate: `node .devin/skills/taste-skill/scripts/lint.mjs index.html src` and
  `node .devin/skills/taste-skill/scripts/inspect.mjs "http://localhost:5173/?nointro#/<station>" --allow late-title`
  (`late-title` is allowed on station deep links: the meter reads the first `h1` in the document, which belongs to a hidden station)
- Dev film harness: `node .taste-skill/shots.mjs <plan.json>` (see `.taste-skill/*.json`); supports wait, click, eval, wheel, key, clickAt, tap, back, log, shot
- Persona test reports and plans live in `.taste-skill/tests/<persona>/` (recruiter, phone, artdirector, a11y, chaos)

## Live counts
- `scripts/fetch-stats.mjs` reads public pages: Instagram followers (both accounts) and reel likes from share tags,
  YouTube subscribers and video views (RSS + channel page, or the Data API with `YOUTUBE_API_KEY`). LinkedIn and TikTok
  block automated reads, so LinkedIn (and the 50,000+ Monumental views) are set by hand in `MANUAL` in that script.
  A failed source keeps its last good number.
- `.github/workflows/stats.yml` runs it every 30 minutes and commits `public/stats.json` when numbers change.
- `src/stats.js` loads `/stats.json` on page load and every 5 minutes; any element with `data-stat="path.in.json"` rolls to the new value.

## Facts on the page
All facts come from Liam's LinkedIn, Instagram, YouTube, CIP, TRCA and Monumental pages (October 2026).
Follower counts live in `index.html` (Social station) and should be refreshed by hand.
