import { useRef, useCallback } from 'react';
import type {
  PointerEvent as ReactPointerEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';

export type LongPressOptions = { delay?: number };

export function useLongPress<T extends Element = Element>(
  onLongPress: () => void,
  opts: LongPressOptions = {}
) {
  const { delay = 600 } = opts;
  const timerRef = useRef<number | null>(null);

  const start = useCallback(
    (e: ReactPointerEvent<T> | ReactKeyboardEvent<T>) => {
      // Only respond to primary button for pointer/mouse
      if ('button' in e && typeof e.button === 'number' && e.button !== 0)
        return;
      if (timerRef.current != null) return;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        onLongPress();
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<T>) => {
      if (e.key === ' ' || e.key === 'Enter') start(e);
    },
    [start]
  );

  const onContextMenu = useCallback((e: ReactMouseEvent<T>) => {
    e.preventDefault();
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onKeyDown,
    onKeyUp: clear,
    onContextMenu,
  } as const;
}
