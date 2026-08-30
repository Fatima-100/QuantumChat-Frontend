import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import screenTimeCollector from '../utils/screenTimeCollector.js';

// Tracks time spent anywhere in the authenticated app, not just on the
// /chat route. Must be mounted above <Routes> so switching between
// /chat, /chat/activity, etc. never unmounts it and stops the collector
// mid-session.
export default function ScreenTimeTracker() {
  const { user, hasLocalKeyring } = useAuth();

  useEffect(() => {
    if (!hasLocalKeyring || !user?.id) return undefined;
    screenTimeCollector.start();
    return () => screenTimeCollector.stop();
  }, [hasLocalKeyring, user?.id]);

  return null;
}