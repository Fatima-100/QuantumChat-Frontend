// The backend's chatThemePresets.js is the source of truth for which
// wallpaper ids are valid, but it deliberately doesn't know about CSS —
// wallpaper ids are just cosmetic labels there. This is the one place that
// maps an id to what it actually looks like, kept separate so re-skinning
// a wallpaper never means touching validation logic.
//
// Full backgrounds use /wallpapers/optimized (≤1280px JPEG) so switching
// themes doesn't pull multi‑MB originals. Modal tiles use /wallpapers/thumbs
// (~160px) so opening Chat theme doesn't download every full image at once.
//
// Every value below is built from translucent layers only (no opaque
// fallback color) so it sits correctly on top of whatever the current app
// theme's chat background already is (light, dark, or eyecare).
export const WALLPAPER_BACKGROUNDS = {
  none: 'transparent',
  'quantum-dots':
    'radial-gradient(circle at 18% 22%, rgba(167,139,250,0.55) 0 2px, transparent 3px),' +
    'radial-gradient(circle at 72% 38%, rgba(196,181,253,0.4) 0 1.5px, transparent 2.5px),' +
    'radial-gradient(circle at 42% 68%, rgba(139,92,246,0.45) 0 2px, transparent 3px),' +
    'radial-gradient(circle at 88% 78%, rgba(167,139,250,0.35) 0 1px, transparent 2px),' +
    'radial-gradient(circle at 28% 35%, #6d28d9 0%, #1e1b4b 55%, #0b1020 100%)',
  aurora: "url('/wallpapers/optimized/aurora.jpg') center/cover no-repeat",
  circuit: "url('/wallpapers/optimized/circuit.jpg') center/cover no-repeat",
  floral: "url('/wallpapers/optimized/floral.jpg') center/cover no-repeat",
  geometric: "url('/wallpapers/optimized/geometric.jpg') center/cover no-repeat",
  stardust: "url('/wallpapers/optimized/stardust.jpg') center/cover no-repeat",
  nebula: "url('/wallpapers/optimized/nebula.jpg') center/cover no-repeat",
  prism: "url('/wallpapers/optimized/prism.jpg') center/cover no-repeat",
};

// Tiny previews for the theme picker — keep these under ~15KB each.
export const WALLPAPER_THUMBNAILS = {
  none: 'transparent',
  // System.Drawing can't reliably decode this webp; CSS stands in for the tile.
  'quantum-dots':
    'radial-gradient(circle at 28% 35%, #a78bfa 0%, #6d28d9 38%, #1e1b4b 72%, #0b1020 100%)',
  aurora: "url('/wallpapers/thumbs/aurora.jpg') center/cover no-repeat",
  circuit: "url('/wallpapers/thumbs/circuit.jpg') center/cover no-repeat",
  floral: "url('/wallpapers/thumbs/floral.jpg') center/cover no-repeat",
  geometric: "url('/wallpapers/thumbs/geometric.jpg') center/cover no-repeat",
  stardust: "url('/wallpapers/thumbs/stardust.jpg') center/cover no-repeat",
  nebula: "url('/wallpapers/thumbs/nebula.jpg') center/cover no-repeat",
  prism: "url('/wallpapers/thumbs/prism.jpg') center/cover no-repeat",
};

// Maps a wallpaper id to the animation variant applied via the
// `data-wallpaper-fx` attribute on `.message-list` (see Chat.jsx). `null`
// means static — most named wallpapers stay still on purpose, since a
// wallpaper that moves *everywhere* gets distracting fast; only the three
// dedicated "animated" wallpapers opt in.
export const WALLPAPER_FX = {
  stardust: 'sparkle',
  nebula: 'glow',
  prism: 'prism',
};

export function getWallpaperBackground(wallpaperId) {
  return WALLPAPER_BACKGROUNDS[wallpaperId] || WALLPAPER_BACKGROUNDS.none;
}

export function getWallpaperThumbnail(wallpaperId) {
  return WALLPAPER_THUMBNAILS[wallpaperId] || getWallpaperBackground(wallpaperId);
}

export function getWallpaperFx(wallpaperId) {
  return WALLPAPER_FX[wallpaperId] || null;
}

/** Warm the browser cache for a wallpaper before/when it is applied. */
export function preloadWallpaper(wallpaperId) {
  if (!wallpaperId || wallpaperId === 'none' || wallpaperId === 'custom') return;
  const bg = getWallpaperBackground(wallpaperId);
  const match = /url\('([^']+)'\)/.exec(bg);
  if (!match) return;
  const img = new Image();
  img.decoding = 'async';
  img.src = match[1];
}
