// The backend's chatThemePresets.js is the source of truth for which
// wallpaper ids are valid, but it deliberately doesn't know about CSS —
// wallpaper ids are just cosmetic labels there. This is the one place that
// maps an id to what it actually looks like, kept separate so re-skinning
// a wallpaper never means touching validation logic.
//
// Every value below is built from translucent layers only (no opaque
// fallback color) so it sits correctly on top of whatever the current app
// theme's chat background already is (light, dark, or eyecare) — an
// earlier version of this file hardcoded light pastel fallback colors,
// which looked broken once the app defaulted to a dark theme.
export const WALLPAPER_BACKGROUNDS = {
  none: 'transparent',
  'quantum-dots': "url('/wallpapers/quantum-dots.webp') center/cover no-repeat",
  // These 6 are real photos in public/wallpapers/ (Vite serves anything in
  // public/ from the site root, so the path is just /wallpapers/<file>, no
  // import needed). center/cover/no-repeat is specified explicitly here
  // because .message-list no longer forces a global background-size — see
  // the comment on WALLPAPER_BACKGROUNDS above.
  aurora: "url('/wallpapers/aurora.webp') center/cover no-repeat",
  circuit:  "url('/wallpapers/circuit.webp') center/cover no-repeat",
  floral: "url('/wallpapers/floral.webp') center/cover no-repeat",
  geometric: "url('/wallpapers/geometric.webp') center/cover no-repeat",

  // --- Animated wallpapers: the photo is the base layer here; the
  // moving/glowing part is a separate CSS-animated pseudo-element on top,
  // wired up via WALLPAPER_FX below and the matching keyframes in
  // index.css — so the sparkle/glow/prism-shift effect still layers
  // correctly over these photos, same as it did over the old gradients. ---
  stardust: "url('/wallpapers/stardust.webp') center/cover no-repeat",
  nebula: "url('/wallpapers/nebula.webp') center/cover no-repeat",
  prism: "url('/wallpapers/prism.webp') center/cover no-repeat",
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

export function getWallpaperFx(wallpaperId) {
  return WALLPAPER_FX[wallpaperId] || null;
}
