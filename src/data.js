// Content that changes often lives here, so updating the site is a one-line edit.

/**
 * Optional: a live Instagram feed. Paste a Behold.so JSON feed URL (free plan works) and the
 * Social station will show his newest posts automatically instead of the list below.
 * https://behold.so  ->  connect @liamvutoronto  ->  "JSON feed" URL
 */
export const FEED_URL = '';

/** Reels on the Social station: his own channel first, then collaborations. */
export const reels = [
  { code: 'Dcj205zyRjI', by: '@liamvutoronto', when: 'August 2026', note: 'OPPI 2026' },
  { code: 'De97BNQyUl3', by: '@liamvutoronto', when: 'October 2026' },
  { code: 'DYXmxBVxKOs', by: 'with @monumentalprojects', when: 'May 2026' },
  { code: 'Ddr26Xez5Mc', by: 'with @lanewayproject', when: 'September 2026' },
  { code: 'DauwlDFx-px', by: '@liamvutoronto', when: 'July 2026' },
  { code: 'DZ51Bq-R6Ep', by: 'with @monumentalprojects', when: 'June 2026' },
  { code: 'DaLjq-hikR0', by: 'with @trca_hq', when: 'June 2026' },
  { code: 'DaSmR4MSPtL', by: '@liamvutoronto', when: 'July 2026' },
];

/** Artwork on the Art station, from @liamvuart. */
export const art = [
  { code: 'DXrZG7qljJN', kind: 'p', when: 'April 2026' },
  { code: 'DV9BFYiEvdI', kind: 'reel', when: 'March 2026' },
  { code: 'DVgwDVvkQv4', kind: 'reel', when: 'March 2026' },
  { code: 'DU5ta7CDqaf', kind: 'reel', when: 'February 2026' },
  { code: 'DKH_3K5vlO8', kind: 'p', when: 'May 2025', note: 'Oh Canada Art Show' },
  { code: 'DJO-yrlOgV6', kind: 'reel', when: 'May 2025' },
  { code: 'DI60sTmJK8T', kind: 'reel', when: 'April 2025' },
  { code: 'DIWkw7eu1-I', kind: 'p', when: 'April 2025' },
  { code: 'DFifu3vx0nP', kind: 'p', when: 'February 2025' },
  { code: 'C02SHoNJ4Os', kind: 'reel', when: 'December 2023' },
];

/** The line, in riding order. mode decides which vehicle carries you there. */
export const stations = [
  { id: 'home', name: 'Liam Vu', mode: 'subway', wall: '#e8e7e2', ink: '#121212' },
  { id: 'social', name: 'Social', mode: 'subway', wall: '#ffc72c', ink: '#121212' },
  { id: 'case-studies', name: 'Case studies', mode: 'bike', wall: '#1d8a4b', ink: '#ffffff' },
  { id: 'projects', name: 'Projects', mode: 'streetcar', wall: '#da251d', ink: '#f4f4f1' },
  { id: 'art', name: 'Art', mode: 'streetcar', wall: '#ecebe6', ink: '#121212' },
  { id: 'about', name: 'About', mode: 'subway', wall: '#0b4ea2', ink: '#ffdc00' },
  { id: 'contact', name: 'Contact', mode: 'subway', wall: '#1a1a1a', ink: '#f4f4f1' },
];
