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
  'quantum-dots': 'radial-gradient(rgba(148, 163, 253, 0.22) 1.5px, transparent 1.5px) 0 0/16px 16px',
  aurora:
    'radial-gradient(circle at 15% 20%, rgba(99, 102, 241, 0.22), transparent 45%), ' +
    'radial-gradient(circle at 85% 15%, rgba(217, 70, 239, 0.18), transparent 45%), ' +
    'radial-gradient(circle at 50% 90%, rgba(168, 85, 247, 0.16), transparent 50%)',
  circuit:
    'linear-gradient(rgba(148, 163, 253, 0.14) 1px, transparent 1px) 0 0/24px 24px, ' +
    'linear-gradient(90deg, rgba(148, 163, 253, 0.14) 1px, transparent 1px) 0 0/24px 24px',
  floral:
    'radial-gradient(circle at 20% 30%, rgba(236, 72, 153, 0.2) 8px, transparent 9px), ' +
    'radial-gradient(circle at 70% 60%, rgba(217, 70, 239, 0.16) 10px, transparent 11px), ' +
    'radial-gradient(circle at 40% 80%, rgba(129, 140, 248, 0.16) 6px, transparent 7px)',
  geometric: 'repeating-linear-gradient(135deg, rgba(148, 163, 253, 0.12) 0 10px, transparent 10px 20px)',

  // --- New: animated wallpapers (base gradient here; the moving/glowing
  // part is a CSS-animated pseudo-element, wired up via WALLPAPER_FX below
  // and the matching keyframes in index.css) ---
  stardust: 'radial-gradient(circle at 30% 70%, rgba(129, 140, 248, 0.18), transparent 60%)',
  nebula:
    'radial-gradient(circle at 25% 30%, rgba(217, 70, 239, 0.2), transparent 55%), ' +
    'radial-gradient(circle at 75% 70%, rgba(56, 189, 248, 0.18), transparent 55%)',
  prism:
    'linear-gradient(120deg, rgba(99, 102, 241, 0.16), rgba(217, 70, 239, 0.12), rgba(56, 189, 248, 0.16))',
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
