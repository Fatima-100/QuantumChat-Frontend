import { useEffect, useRef, useState } from 'react';
import {
  fetchThemeCatalog,
  fetchWallpaperImageUrl,
  removeWallpaperImage,
  resetChatTheme,
  saveChatTheme,
  uploadWallpaperImage,
} from '../api/chatThemes.js';
import { getWallpaperBackground } from '../theme/wallpaperBackgrounds.js';

const MAX_WALLPAPER_BYTES = 10 * 1024 * 1024; // matches backend wallpaperUpload limit

// `theme` is the currently-applied { presetId, bubbleColorId, wallpaperId }
// for this conversation (see Chat.jsx). `onApplied` receives the updated
// theme object every time a change is saved, so the caller can update its
// CSS variables immediately without waiting for a refetch.
export default function ChatThemeModal({ peerId, theme, onApplied, onClose }) {
  const [catalog, setCatalog] = useState(null);
  const [customizing, setCustomizing] = useState(null); // null | 'bubble' | 'wallpaper'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchThemeCatalog()
      .then(setCatalog)
      .catch(() => setError('Could not load theme options'));
  }, []);

  // Custom wallpaper bytes aren't public — fetch them as an authenticated
  // blob (same pattern AttachmentBubble uses) and turn them into a local
  // object URL. Revoke the previous URL whenever it's replaced or the
  // conversation changes, so we don't leak blob URLs across theme switches.
  useEffect(() => {
    if (theme.wallpaperId !== 'custom') {
      setCustomWallpaperUrl(null);
      return;
    }
    let cancelled = false;
    let urlToRevoke = null;
    fetchWallpaperImageUrl(peerId).then((url) => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      urlToRevoke = url;
      setCustomWallpaperUrl(url);
    });
    return () => {
      cancelled = true;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [peerId, theme.wallpaperId, theme.updatedAt]);

  async function applyPreset(presetId) {
    setSaving(true);
    setError('');
    try {
      const updated = await saveChatTheme(peerId, { presetId });
      onApplied(updated);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to apply theme');
    } finally {
      setSaving(false);
    }
  }

  async function applyCustom(nextBubbleColorId, nextWallpaperId) {
    setSaving(true);
    setError('');
    try {
      // Only send the field being changed. Re-sending the *other* field
      // unconditionally used to break as soon as a custom wallpaper was
      // active: theme.wallpaperId would be 'custom', which the server
      // rejects on this endpoint by design (it's only settable via the
      // upload route), so every bubble-color click would 400 forever.
      const payload = {};
      if (nextBubbleColorId != null) payload.bubbleColorId = nextBubbleColorId;
      if (nextWallpaperId != null) payload.wallpaperId = nextWallpaperId;
      const updated = await saveChatTheme(peerId, payload);
      onApplied(updated);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to apply theme');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setError('');
    try {
      const updated = await resetChatTheme(peerId);
      onApplied(updated);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset theme');
    } finally {
      setSaving(false);
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    if (file.size > MAX_WALLPAPER_BYTES) {
      setError('Image is too large (max 10MB)');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await uploadWallpaperImage(peerId, file);
      onApplied(updated);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload wallpaper');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveWallpaper() {
    setSaving(true);
    setError('');
    try {
      const updated = await removeWallpaperImage(peerId);
      onApplied(updated);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove wallpaper');
    } finally {
      setSaving(false);
    }
  }

  if (!catalog) {
    return (
      <div className="theme-modal-backdrop" onClick={onClose}>
        <div className="theme-modal" onClick={(e) => e.stopPropagation()}>
          <p className="empty-hint">Loading theme options…</p>
        </div>
      </div>
    );
  }

  const currentBubble = catalog.bubbleColors.find((b) => b.id === theme.bubbleColorId);

  return (
    <div className="theme-modal-backdrop" onClick={onClose}>
      <div className="theme-modal" onClick={(e) => e.stopPropagation()}>
        <div className="theme-modal-header">
          <span>Chat theme</span>
          <button className="link-button" onClick={onClose}>
            Close
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <p className="theme-section-label">Themes</p>
        <div className="theme-preset-grid">
          {catalog.presets.map((preset) => {
            const bubble = catalog.bubbleColors.find((b) => b.id === preset.bubbleColorId);
            const active = theme.presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`theme-preset-tile ${active ? 'active' : ''}`}
                style={{ background: getWallpaperBackground(preset.wallpaperId) }}
                onClick={() => applyPreset(preset.id)}
                disabled={saving}
                title={preset.name}
              >
                <span className="theme-preset-swatch" style={{ background: bubble?.mine }} />
              </button>
            );
          })}
        </div>
        <p className="theme-hint">The chat bubble and wallpaper will both change.</p>

        <p className="theme-section-label">Customize</p>
        <button
          type="button"
          className="theme-customize-row"
          onClick={() => setCustomizing(customizing === 'bubble' ? null : 'bubble')}
        >
          <span>Chat bubble</span>
          <span className="theme-preset-swatch small" style={{ background: currentBubble?.mine }} />
        </button>
        {customizing === 'bubble' && (
          <div className="theme-swatch-grid">
            {catalog.bubbleColors.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`theme-swatch ${theme.bubbleColorId === b.id ? 'active' : ''}`}
                style={{ background: b.mine }}
                title={b.name}
                disabled={saving}
                onClick={() => applyCustom(b.id, null)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          className="theme-customize-row"
          onClick={() => setCustomizing(customizing === 'wallpaper' ? null : 'wallpaper')}
        >
          <span>Wallpaper</span>
          <span
            className="theme-preset-swatch small"
            style={
              theme.wallpaperId === 'custom' && customWallpaperUrl
                ? { backgroundImage: `url(${customWallpaperUrl})`, backgroundSize: 'cover' }
                : { background: getWallpaperBackground(theme.wallpaperId) }
            }
          />
        </button>
        {customizing === 'wallpaper' && (
          <>
            <div className="theme-swatch-grid">
              {catalog.wallpapers.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className={`theme-swatch ${theme.wallpaperId === w.id ? 'active' : ''}`}
                  style={{ background: getWallpaperBackground(w.id) }}
                  title={w.name}
                  disabled={saving}
                  onClick={() => applyCustom(null, w.id)}
                />
              ))}
              {theme.wallpaperId === 'custom' && customWallpaperUrl && (
                <button
                  type="button"
                  className="theme-swatch active"
                  style={{ backgroundImage: `url(${customWallpaperUrl})`, backgroundSize: 'cover' }}
                  title="Your uploaded wallpaper"
                  disabled
                />
              )}
              <button
                type="button"
                className="theme-swatch theme-swatch-upload"
                title="Upload your own"
                disabled={saving}
                onClick={handleUploadClick}
              >
                +
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {theme.wallpaperId === 'custom' && (
              <button
                type="button"
                className="link-button theme-remove-wallpaper-button"
                onClick={handleRemoveWallpaper}
                disabled={saving}
              >
                Remove uploaded wallpaper
              </button>
            )}
          </>
        )}

        <button type="button" className="link-button theme-reset-button" onClick={handleReset} disabled={saving}>
          Reset to default
        </button>
      </div>
    </div>
  );
}
