import { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';

export function useOnlineStatus() {
  const setOnline = useUIStore(s => s.setOnline);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [setOnline]);
}
