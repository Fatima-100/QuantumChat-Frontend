import client from './client.js';

// Static catalog (preset combos + individual bubble colors/wallpapers) the
// picker renders from. Rarely changes, so callers are free to cache it.
export async function fetchThemeCatalog() {
  const { data } = await client.get('/chat-themes/presets');
  return data.data;
}

// The caller's saved theme for a specific 1:1 conversation, or the default
// shape ({ bubbleColorId: 'default', wallpaperId: 'none' }) if unset.
export async function fetchChatTheme(peerId) {
  const { data } = await client.get(`/chat-themes/${peerId}`);
  return data.data;
}

// payload is EITHER { presetId } for a top-grid combo, OR
// { bubbleColorId, wallpaperId } for independent "Customize" picks.
export async function saveChatTheme(peerId, payload) {
  const { data } = await client.put(`/chat-themes/${peerId}`, payload);
  return data.data;
}

export async function resetChatTheme(peerId) {
  const { data } = await client.delete(`/chat-themes/${peerId}`);
  return data.data;
}

// Uploads a custom wallpaper image (multipart). Backend sets wallpaperId to
// the 'custom' sentinel and returns the updated theme, same shape as
// saveChatTheme's return value.
export async function uploadWallpaperImage(peerId, file) {
  const form = new FormData();
  form.append('wallpaper', file);
  const { data } = await client.post(`/chat-themes/${peerId}/wallpaper`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

// Fetches the caller's own uploaded wallpaper bytes and returns a local
// object URL for use in an <img>/background-image — same pattern as
// AttachmentBubble's blob fetch, minus the E2E unsealing step (wallpapers
// aren't encrypted, they're a cosmetic personal asset like an avatar).
export async function fetchWallpaperImageUrl(peerId) {
  const res = await client.get(`/chat-themes/${peerId}/wallpaper`, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
}

// Clears only the custom wallpaper, keeping the chosen bubble color.
export async function removeWallpaperImage(peerId) {
  const { data } = await client.delete(`/chat-themes/${peerId}/wallpaper`);
  return data.data;
}
