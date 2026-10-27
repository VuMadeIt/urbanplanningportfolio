// Content that changes often lives here, so updating the site is a one-line edit.

/**
 * Optional: a live Instagram feed. Paste a Behold.so JSON feed URL (free plan works) and the
 * Social station will show his newest posts automatically instead of the list below.
 * https://behold.so  ->  connect @liamvutoronto  ->  "JSON feed" URL
 */
export const FEED_URL = '';

/** Reels on the Social station. Covers live in public/media/reels/<code>.jpg */
export const reels = [
  { code: 'DcOkmuiymGW', title: 'What is adaptive reuse?', by: '@liamvutoronto', when: 'August 2026', likes: 180, series: 'One Minute Urbanism' },
  { code: 'Db52C25Sbgu', title: 'What are third places?', by: '@liamvutoronto', when: 'August 2026', likes: 178, series: 'One Minute Urbanism' },
  { code: 'DYXmxBVxKOs', title: 'Greetings from Ookwemin Minising', by: 'with @monumentalprojects', when: 'May 2026', likes: 971 },
  { code: 'Ddr26Xez5Mc', title: 'Transforming Toronto’s laneways', by: 'with @lanewayproject', when: 'September 2026', likes: 170 },
  { code: 'DaLjq-hikR0', title: 'Invasive carp surveillance', by: 'with @trca_hq', when: 'June 2026', likes: 558 },
  { code: 'Dcj205zyRjI', title: 'Ontario planners, listen up', by: '@liamvutoronto', when: 'August 2026', likes: 57 },
  { code: 'DauwlDFx-px', title: 'Every planner’s dream', by: '@liamvutoronto', when: 'July 2026', likes: 139 },
  { code: 'DZ1i4ONktqW', title: 'These are climate stripes', by: 'with @trca_hq', when: 'June 2026', likes: 283 },
  { code: 'DaSmR4MSPtL', title: 'Don’t be afraid of conferences', by: '@liamvutoronto', when: 'July 2026', likes: 85 },
  { code: 'DZ51Bq-R6Ep', title: 'The Biidaasige Prize', by: 'with @monumentalprojects', when: 'June 2026', likes: 92 },
];

/**
 * The line, in riding order. mode decides which vehicle carries you there.
 * Every subway stop is tiled after a real station's original scheme: the 1954 Yonge line was
 * Vitrolite structural glass in three tints with four trim colours; the 1963 University line added more.
 * Station names were set large in the trim colour, and small in the wall colour along the trim.
 */
export const stations = [
  { id: 'home', name: 'Liam Vu', mode: 'subway', after: 'Eglinton, 1954', tile: 'Pearl Grey', trimName: 'Black', wall: '#dcd8dc', trim: '#1c1c1e', ink: '#1c1c1e' },
  { id: 'social', name: 'Social', mode: 'subway', after: 'Union, 1954', tile: 'Primrose', trimName: 'American Red', wall: '#eedc94', trim: '#a8262b', ink: '#a8262b' },
  { id: 'case-studies', name: 'Case studies', mode: 'bike', wall: '#1d8a4b', trim: '#16703c', ink: '#ffffff' },
  { id: 'projects', name: 'Projects', mode: 'streetcar', wall: '#da251d', trim: '#b51c15', ink: '#f4f4f1' },
  { id: 'art', name: 'Art', mode: 'subway', after: 'Museum, 1963', tile: 'Yellow', trimName: 'Blue', wall: '#e7cf7c', trim: '#2a4f8f', ink: '#2a4f8f', columns: true },
  { id: 'contact', name: 'Contact', mode: 'subway', after: 'St. Patrick, 1963', tile: 'Green', trimName: 'Forest Green', wall: '#7fae94', trim: '#24533b', ink: '#1f4632' },
  // a hidden stop: reached through a few secret doors on the site, never on the map
  { id: 'shrine', name: 'Olivia Chow Shrine', mode: 'subway', hidden: true, wall: '#2a2235', trim: '#e9c46a', ink: '#e9c46a' },
];
