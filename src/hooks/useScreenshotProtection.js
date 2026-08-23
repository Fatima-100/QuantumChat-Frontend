import { useEffect, useRef } from 'react';

/**
 * Best-effort screenshot / screen-capture protection for the web app.
 *
 * Applied on the viewer's device when viewing content from someone who enabled
 * screenshot protection — not on the account owner's own device.
 *
 * Browsers cannot fully block OS screenshots. This hook:
 * - Detects common screenshot shortcuts (PrintScreen, etc.) and notifies
 * - Flashes a black privacy overlay so captured frames are blanked when possible
 * - Blurs protected UI while the tab is hidden (helps with some screen shares)
 *
 * Mobile apps use FLAG_SECURE / iOS capture APIs for stronger enforcement.
 */
export function useScreenshotProtection(enabled, { onAttempt, scope = 'chat' } = {}) {
  const onAttemptRef = useRef(onAttempt);
  onAttemptRef.current = onAttempt;
  const flashTimerRef = useRef(null);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    root.classList.add('qc-screenshot-protection');
    root.dataset.qcProtectScope = scope;

    function flashPrivacyOverlay(reason) {
      let overlay = document.getElementById('qc-screenshot-flash');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'qc-screenshot-flash';
        overlay.className = 'qc-screenshot-flash';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);
      }
      overlay.classList.add('is-active');
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => {
        overlay.classList.remove('is-active');
      }, 900);
      onAttemptRef.current?.(reason || 'screenshot');
    }

    function isScreenshotChord(e) {
      const key = e.key || '';
      const code = e.code || '';
      if (key === 'PrintScreen' || code === 'PrintScreen') return true;
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        const k = key.toLowerCase();
        if (k === 's' || k === '3' || k === '4' || k === '5') return true;
      }
      if (e.metaKey && e.shiftKey && (code === 'Digit3' || code === 'Digit4' || code === 'Digit5')) {
        return true;
      }
      return false;
    }

    function onKeyDown(e) {
      if (!isScreenshotChord(e)) return;
      flashPrivacyOverlay('screenshot');
    }

    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        root.classList.add('qc-screenshot-blur');
      } else {
        root.classList.remove('qc-screenshot-blur');
      }
    }

    function onWindowBlur() {
      root.classList.add('qc-screenshot-blur');
    }

    function onWindowFocus() {
      if (document.visibilityState === 'visible') {
        root.classList.remove('qc-screenshot-blur');
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyDown, true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyDown, true);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
      root.classList.remove('qc-screenshot-protection', 'qc-screenshot-blur');
      delete root.dataset.qcProtectScope;
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      document.getElementById('qc-screenshot-flash')?.remove();
    };
  }, [enabled, scope]);
}
