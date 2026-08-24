import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import {
  EMOJI_CATEGORIES,
  getRecentEmojis,
  pushRecentEmoji,
  searchEmojis,
} from '../utils/emojis.js';

export default function EmojiPicker({ onSelect, onPick, isOpen, onClose }) {
  const panelRef = useRef(null);
  const gridRef = useRef(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [recent, setRecent] = useState(() => getRecentEmojis());
  const triggerSelect = onSelect || onPick;
  const isCurrentlyOpen = isOpen !== undefined ? isOpen : true;

  const handleEmojiClick = useCallback(
    (emoji) => {
      pushRecentEmoji(emoji);
      setRecent(getRecentEmojis());
      triggerSelect?.(emoji);
      onClose?.();
      setQuery('');
    },
    [triggerSelect, onClose],
  );

  useEffect(() => {
    if (!isCurrentlyOpen) return;
    setRecent(getRecentEmojis());
  }, [isCurrentlyOpen]);

  useEffect(() => {
    if (!isCurrentlyOpen || !onClose) return;

    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        const isToggle = event.target.closest('.attach-button');
        if (!isToggle) onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCurrentlyOpen, onClose]);

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;
  const searchResults = useMemo(
    () => (isSearching ? searchEmojis(trimmedQuery, 200) : []),
    [isSearching, trimmedQuery],
  );

  const activeEmojis = useMemo(() => {
    if (activeCategory === 'recent') return recent;
    const cat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
    return cat?.emojis || [];
  }, [activeCategory, recent]);

  function selectCategory(id) {
    setQuery('');
    setActiveCategory(id);
    if (gridRef.current) gridRef.current.scrollTop = 0;
  }

  if (!isCurrentlyOpen) return null;

  return (
    <div className="emoji-picker" ref={panelRef} role="dialog" aria-label="Emoji picker">
      <div className="emoji-picker-header">
        <span>
          {isSearching
            ? 'Search'
            : activeCategory === 'recent'
              ? 'Recently used'
              : EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.label || 'Emojis'}
        </span>
        <button
          type="button"
          className="emoji-picker-close"
          onClick={onClose}
          aria-label="Close emoji picker"
        >
          ×
        </button>
      </div>

      <div className="emoji-picker-search-wrap">
        <input
          className="emoji-picker-search"
          type="text"
          placeholder="Search emoji"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search emojis"
          autoComplete="off"
        />
      </div>

      {isSearching ? (
        searchResults.length > 0 ? (
          <div className="emoji-picker-grid emoji-picker-search-results" ref={gridRef}>
            {searchResults.map((emoji) => (
              <button
                key={emoji}
                className="emoji-picker-btn"
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
          <p className="emoji-picker-empty">No emoji found</p>
        )
      ) : (
        <div className="emoji-picker-grid" ref={gridRef}>
          {activeEmojis.length ? (
            activeEmojis.map((emoji) => (
              <button
                key={`${activeCategory}-${emoji}`}
                type="button"
                className="emoji-picker-btn"
                onClick={() => handleEmojiClick(emoji)}
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))
          ) : (
            <p className="emoji-picker-empty">
              {activeCategory === 'recent' ? 'No recent emoji yet' : 'No emoji'}
            </p>
          )}
        </div>
      )}

      {!isSearching ? (
        <div className="emoji-picker-tabs" role="tablist" aria-label="Emoji categories">
          <button
            type="button"
            role="tab"
            className={`emoji-picker-tab${activeCategory === 'recent' ? ' active' : ''}`}
            aria-selected={activeCategory === 'recent'}
            title="Recently used"
            onClick={() => selectCategory('recent')}
          >
            🕐
          </button>
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              className={`emoji-picker-tab${activeCategory === cat.id ? ' active' : ''}`}
              aria-selected={activeCategory === cat.id}
              title={cat.label}
              onClick={() => selectCategory(cat.id)}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
