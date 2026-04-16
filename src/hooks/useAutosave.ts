import { useEffect, useRef } from 'react';
import { useUIStore } from '@/store/uiStore';

/**
 * Dispara a função `save` com debounce sempre que `value` mudar.
 * Também atualiza o saveState global para feedback visual.
 */
export function useAutosave<T>(
  value: T,
  save: (v: T) => Promise<void> | void,
  opts: { delay?: number; enabled?: boolean } = {},
): void {
  const { delay = 700, enabled = true } = opts;
  const setSaveState = useUIStore(s => s.setSaveState);
  const setLastSavedAt = useUIStore(s => s.setLastSavedAt);
  const timer = useRef<number | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState('saving');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        await save(value);
        setSaveState('saved');
        setLastSavedAt(new Date().toISOString());
      } catch (e) {
        console.error('autosave failed', e);
        setSaveState('error');
      }
    }, delay);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled]);
}
