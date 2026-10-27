# Liam Vu portfolio: agent notes

A TTC-themed portfolio for Liam Vu (@liamvutoronto), "The Urban Planning Influencer".
Plain HTML/CSS/JS with Vite, GSAP 3.15 (ScrollTrigger) and Lenis. No framework.

## Commands
- `npm install`
- `npm run dev`: dev server on http://localhost:5173
- `npm run build` then `npm run preview`: production build in `dist/` (check the build before shipping)
- `?nointro` skips the train intro; `#/social`, `#/case-studies`, `#/projects`, `#/art`, `#/about`, `#/contact` open a station directly

## Structure
- `index.html`: all page content (every station is a `<section class="station">`, only `.is-current` shows when JS runs; without JS they all show stacked)
- `src/main.js`: boot, hash router, Lenis, bar colour, hero entrances
- `src/intro.js`: platform intro (train arrives, doors open, camera boards)
- `src/ride.js`: transitions, chosen by the destination's mode: `subway` (inside the car: doors, tunnel), `streetcar` (stop, Flexity pulls in), `bike` (green lane, cyclist)
- `src/kit.js`: SVG drawings (Toronto Rocket, Flexity, cyclist, stop pole, skyline)
- `src/content.js`: Instagram embeds (lazy), YouTube facades, counters, seams, credits, fitted station names
- `src/data.js`: reels, art posts and the station list. Optional `FEED_URL` (Behold.so JSON) makes the reels update automatically
- `src/audio.js`: synthesized chimes, off by default
- `public/media/`: downloaded photos and clips; `credits.json` records source and licence and feeds the credits list

## Design rules (taste-skill, in `.devin/skills/taste-skill`)
- One family (Jost Variable), five sizes, square buttons, no gradients, no shadows at rest, no eyebrows, no monospace
- Station names are each station's `h1`; section titles are `h2`
- Gate: `node .devin/skills/taste-skill/scripts/lint.mjs index.html src` and
  `node .devin/skills/taste-skill/scripts/inspect.mjs "http://localhost:5173/?nointro#/<station>" --allow late-title`
  (`late-title` is allowed on station deep links: the meter reads the first `h1` in the document, which belongs to a hidden station)
- Dev film harness: `node .taste-skill/shots.mjs <plan.json>` (see `.taste-skill/*.json`)

## Facts on the page
All facts come from Liam's LinkedIn, Instagram, YouTube, CIP, TRCA and Monumental pages (October 2026).
Follower counts live in `index.html` (Social station) and should be refreshed by hand.
