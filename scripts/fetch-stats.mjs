// Collects Liam's public counts and writes public/stats.json, which the site reads and animates to.
// Zero dependencies (Node 22+). Run: npm run stats   (add --soft to never fail, e.g. inside a build)
//
// Sources, all public pages:
//   Instagram  profile followers (both accounts) and likes on each reel, from the pages' share tags
//   YouTube    subscribers and views per video (RSS + channel page, or the Data API if YOUTUBE_API_KEY is set)
//   LinkedIn and TikTok refuse automated reads, so those numbers are kept by hand below.
// A source that fails keeps its last good number: the file never goes backwards to blanks.
import { readFile, writeFile } from 'node:fs/promises';
import { reels } from '../src/data.js';

const OUT = new URL('../public/stats.json', import.meta.url);
const SOFT = process.argv.includes('--soft');
const IG_ACCOUNTS = ['liamvutoronto', 'liamvuart'];
const YT_CHANNEL = 'UC2zFXyT0n7vDkD6TU9iSDEQ';
const YT_HANDLE = 'liamvutoronto';
const EXTRA_POSTS = ['De97BNQyUl3']; // his most-liked reel, quoted on the Social station
const MANUAL = {
  linkedin: { followers: 1250, source: 'manual', note: 'LinkedIn blocks automated reads; update by hand' },
  monumentalViews: { value: 50000, source: 'manual', note: 'From his Monumental role on LinkedIn' },
};

const UA_SHARE = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const log = (...a) => console.log('[stats]', ...a);
const num = (s) => {
  if (s == null) return null;
  const m = String(s).replace(/,/g, '').match(/([\d.]+)\s*([KkMm])?/);
  if (!m) return null;
  return Math.round(parseFloat(m[1]) * (m[2] ? (/k/i.test(m[2]) ? 1e3 : 1e6) : 1));
};

async function get(url, ua = UA_BROWSER, tries = 2) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': ua, 'accept-language': 'en' }, signal: AbortSignal.timeout(15000), redirect: 'follow' });
      if (res.ok) return await res.text();
      log('HTTP', res.status, url);
    } catch (e) { log('fetch failed', url, e.message); }
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  return null;
}
const ogDescription = (html) => html?.match(/<meta property="og:description" content="([^"]*)"/)?.[1]?.replace(/&#064;/g, '@') || null;

async function instagramProfile(user) {
  const d = ogDescription(await get(`https://www.instagram.com/${user}/`, UA_SHARE));
  const m = d?.match(/([\d.,]+[KkMm]?) Followers, ([\d.,]+[KkMm]?) Following, ([\d.,]+[KkMm]?) Posts/);
  return m ? { followers: num(m[1]), following: num(m[2]), posts: num(m[3]) } : null;
}
async function instagramPost(code) {
  const d = ogDescription(await get(`https://www.instagram.com/p/${code}/`, UA_SHARE));
  const m = d?.match(/([\d.,]+[KkMm]?) likes?, ([\d.,]+[KkMm]?) comments?/);
  return m ? { likes: num(m[1]), comments: num(m[2]) } : null;
}

async function youtube() {
  const key = process.env.YOUTUBE_API_KEY;
  if (key) {
    const ch = await get(`https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&id=${YT_CHANNEL}&key=${key}`);
    const c = ch && JSON.parse(ch).items?.[0];
    if (c) {
      const up = c.contentDetails.relatedPlaylists.uploads;
      const pl = JSON.parse((await get(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${up}&key=${key}`)) || '{}');
      const ids = (pl.items || []).map((i) => i.contentDetails.videoId).join(',');
      const vs = ids ? JSON.parse((await get(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${key}`)) || '{}') : {};
      const videos = Object.fromEntries((vs.items || []).map((v) => [v.id, Number(v.statistics.viewCount)]));
      return { subscribers: Number(c.statistics.subscriberCount), totalViews: Number(c.statistics.viewCount), videos, source: 'api' };
    }
  }
  const rss = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL}`);
  const videos = {};
  if (rss) for (const entry of rss.split('<entry>').slice(1)) {
    const id = entry.match(/<yt:videoId>([^<]+)/)?.[1];
    const views = entry.match(/<media:statistics views="(\d+)"/)?.[1];
    if (id && views) videos[id] = Number(views);
  }
  const about = await get(`https://www.youtube.com/@${YT_HANDLE}/about`);
  const subscribers = num(about?.match(/([\d.,]+[KkMm]?) subscribers/)?.[1]);
  if (!rss && subscribers == null) return null;
  return { subscribers, totalViews: Object.values(videos).reduce((a, b) => a + b, 0) || null, videos, source: 'public' };
}

/** Prefer new values, but never replace a number with nothing */
function merge(prev, next) {
  if (next == null) return prev ?? null;
  if (typeof next !== 'object' || Array.isArray(next)) return next;
  const out = { ...(prev && typeof prev === 'object' ? prev : {}) };
  for (const [k, v] of Object.entries(next)) out[k] = merge(out[k], v);
  return out;
}

async function main() {
  let prev = {};
  try { prev = JSON.parse(await readFile(OUT, 'utf8')); } catch {}

  const ok = {};
  const instagram = {};
  for (const u of IG_ACCOUNTS) {
    instagram[u] = await instagramProfile(u);
    ok[`instagram:${u}`] = !!instagram[u];
  }
  const posts = {};
  for (const code of [...new Set([...reels.map((r) => r.code), ...EXTRA_POSTS])]) {
    posts[code] = await instagramPost(code);
    await new Promise((r) => setTimeout(r, 350));
  }
  ok.reels = Object.values(posts).filter(Boolean).length;
  const yt = await youtube();
  ok.youtube = !!yt;

  const next = merge(prev, { instagram, reels: posts, youtube: yt, ...MANUAL });
  const ig = next.instagram || {};
  next.totals = {
    followers: [ig.liamvutoronto?.followers, ig.liamvuart?.followers, next.linkedin?.followers, next.youtube?.subscribers]
      .reduce((a, b) => a + (Number(b) || 0), 0),
  };
  const fresh = Object.entries(ok).filter(([, v]) => v).length;
  next.updated = fresh ? new Date().toISOString() : prev.updated || null;
  next.ok = ok;

  await writeFile(OUT, JSON.stringify(next, null, 2) + '\n');
  log('wrote public/stats.json', JSON.stringify({ ok, followers: next.totals.followers, yt: next.youtube?.subscribers }));
  if (!fresh && !SOFT) { log('no source answered; kept the last known numbers'); process.exitCode = 1; }
}

main().catch((e) => { log('error', e.message); if (!SOFT) process.exitCode = 1; });
