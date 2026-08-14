import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban, Image as ImageIcon, Lock, MoreVertical, Search, Star, Unlock, VolumeX } from 'lucide-react';

const MENU_WIDTH = 210;
const MENU_EST_HEIGHT = 260;

function computePosition(triggerEl) {
  const rect = triggerEl.getBoundingClientRect();
  const gap = 8;
  const pad = 12;
  const spaceBelow = window.innerHeight - rect.bottom - pad;
  const openUp = spaceBelow < MENU_EST_HEIGHT;
  let top = openUp ? rect.top - MENU_EST_HEIGHT - gap : rect.bottom + gap;
  top = Math.max(pad, Math.min(top, window.innerHeight - MENU_EST_HEIGHT - pad));
  let right = window.innerWidth - rect.right;
  right = Math.max(pad, Math.min(right, window.innerWidth - MENU_WIDTH - pad));
  return { top, right, openUp };
}

export default function ChatOptionsMenu({
  isGroup,
  isBlocked,
  isMuted,
  isVaulted,
  onToggleBlock,
  onToggleMute,
  onToggleVault,
  onSearch,
  onWallpaper,
  onStarred,
  onMedia,
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (!e.target.closest('.chat-options-menu-trigger') && !e.target.closest('.chat-options-dropdown')) {
        setOpen(false);
      }
    }
    function onEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onDocClick);
    window.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onDocClick);
      window.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  function run(fn) {
    setOpen(false);
    fn?.();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="icon-btn chat-options-menu-trigger"
        aria-label="Chat options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (!open) setPos(computePosition(triggerRef.current));
          setOpen((v) => !v);
        }}
      >
        <MoreVertical size={18} strokeWidth={2} aria-hidden="true" />
      </button>

      {open && pos &&
        createPortal(
          <div
            className={`chat-options-dropdown${pos.openUp ? ' open-up' : ''}`}
            role="menu"
            aria-label="Chat options"
            style={{ position: 'fixed', top: pos.top, right: pos.right, left: 'auto', bottom: 'auto' }}
          >
            <button type="button" role="menuitem" onClick={() => run(onSearch)}>
              <Search size={15} /> Search in chat
            </button>
            <button type="button" role="menuitem" onClick={() => run(onMedia)}>
              <ImageIcon size={15} /> Chat media
            </button>
            <button type="button" role="menuitem" onClick={() => run(onStarred)}>
              <Star size={15} /> Starred messages
            </button>
            {onWallpaper && (
              <button type="button" role="menuitem" onClick={() => run(onWallpaper)}>
                🎨 Wallpaper
              </button>
            )}
            {onToggleMute && (
              <button type="button" role="menuitem" onClick={() => run(onToggleMute)}>
                <VolumeX size={15} /> {isMuted ? 'Unmute' : 'Mute'}
              </button>
            )}
            {!isGroup && onToggleVault && (
              <button type="button" role="menuitem" onClick={() => run(onToggleVault)}>
                {isVaulted ? <Unlock size={15} /> : <Lock size={15} />}{' '}
                {isVaulted ? 'Remove from vault' : 'Add to vault'}
              </button>
            )}
            {!isGroup && onToggleBlock && (
              <button type="button" role="menuitem" className="danger" onClick={() => run(onToggleBlock)}>
                <Ban size={15} /> {isBlocked ? 'Unblock' : 'Block'}
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}