import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

const EVENTS = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
const CHECK_INTERVAL = 30_000;

export function useIdleTimeout() {
  const touch = useAuthStore(s => s.touchActivity);
  const logout = useAuthStore(s => s.logout);
  const session = useAuthStore(s => s.session);
  const isIdle = useAuthStore(s => s.isIdle);

  useEffect(() => {
    if (!session) return;
    const handler = () => touch();
    EVENTS.forEach(ev => window.addEventListener(ev, handler, { passive: true }));

    const interval = window.setInterval(() => {
      if (isIdle()) {
        logout();
      }
    }, CHECK_INTERVAL);

    return () => {
      EVENTS.forEach(ev => window.removeEventListener(ev, handler));
      window.clearInterval(interval);
    };
  }, [session, touch, logout, isIdle]);
}
