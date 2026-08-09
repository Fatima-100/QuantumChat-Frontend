import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * useFocusTrap — Traps keyboard focus inside the element pointed to by `ref`.
 * When `active` is true, Tab/Shift+Tab will cycle within the container
 * and Escape will trigger `onEscape` (or click the first close button).
 *
 * Auto-focuses the first field once when the trap activates — not on every
 * render — so typing in inputs is not interrupted.
 *
 * @param {React.RefObject} ref - Ref to the modal/dialog container element.
 * @param {boolean} [active=true] - Whether the trap is active.
 * @param {Object} [options] - Additional options.
 * @param {Function} [options.onEscape] - Callback when Escape is pressed.
 */
export default function useFocusTrap(ref, active = true, { onEscape } = {}) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active || !ref.current) return undefined;

    const container = ref.current;

    // Prefer the first text field so dialogs open ready for typing.
    const preferred =
      container.querySelector(
        'input:not([disabled]):not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), textarea:not([disabled])',
      ) || container.querySelectorAll(FOCUSABLE_SELECTORS)[0];
    preferred?.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onEscapeRef.current) {
          onEscapeRef.current();
        } else {
          const closeBtn = container.querySelector(
            '[aria-label*="Close"], [aria-label*="close"], .emoji-picker-close, .modal-close, .create-group-close',
          );
          closeBtn?.click();
        }
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableEls = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS));
      if (focusableEls.length === 0) return;

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [ref, active]);
}
