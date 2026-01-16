import { RefObject, useCallback, useEffect, useRef } from 'react';

interface WindowAutoSizeOptions {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  debounceMs?: number;
  padding?: number;
  enabled?: boolean;
  changeThreshold?: number;
}

const clampDimension = (value: number, min: number, max?: number) => {
  if (!Number.isFinite(value)) {
    return min;
  }
  const rounded = Math.round(value);
  const withMin = Math.max(min, rounded);
  if (typeof max === 'number' && Number.isFinite(max)) {
    return Math.min(max, withMin);
  }
  return withMin;
};

export function useWindowAutoSize(
  targetRef: RefObject<HTMLElement>,
  options: WindowAutoSizeOptions = {}
) {
  const {
    minWidth = 120,
    maxWidth,
    minHeight = 10,
    maxHeight,
    debounceMs = 80,
    padding = 0,
    enabled = true,
    changeThreshold = 2,
    dragSettleDelayMs = 160,
  } = options;

  const lastAppliedSizeRef = useRef({ width: 0, height: 0 });
  const pendingSizeRef = useRef<{ width: number; height: number } | null>(null);
  const isDraggingRef = useRef(false);
  const debounceTimeoutRef = useRef<number>();
  const dragSettleTimeoutRef = useRef<number>();

  const applyResize = useCallback(
    (rawWidth: number, rawHeight: number) => {
      if (!enabled) return;
      const targetWidth = clampDimension(rawWidth + padding, minWidth, maxWidth);
      const targetHeight = clampDimension(rawHeight + padding, minHeight, maxHeight);

      const { width: lastWidth, height: lastHeight } = lastAppliedSizeRef.current;
      if (
        Math.abs(targetWidth - lastWidth) < changeThreshold &&
        Math.abs(targetHeight - lastHeight) < changeThreshold
      ) {
        return;
      }

      const resizeWindow = window.electronAPI?.resizeWindow;
      if (resizeWindow) {
        resizeWindow(targetWidth, targetHeight);
      } else if (targetRef.current) {
        targetRef.current.style.width = `${targetWidth}px`;
        targetRef.current.style.height = `${targetHeight}px`;
      }

      lastAppliedSizeRef.current = { width: targetWidth, height: targetHeight };
    },
    [changeThreshold, enabled, maxHeight, maxWidth, minHeight, minWidth, padding, targetRef]
  );

  const scheduleResize = useCallback(
    (width: number, height: number) => {
      if (!enabled) return;

      if (isDraggingRef.current) {
        pendingSizeRef.current = { width, height };
        return;
      }

      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
      }

      if (debounceMs > 0) {
        debounceTimeoutRef.current = window.setTimeout(() => {
          applyResize(width, height);
        }, debounceMs);
      } else {
        applyResize(width, height);
      }
    },
    [applyResize, debounceMs, enabled]
  );

  useEffect(() => {
    if (!enabled) return;
    const element = targetRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      scheduleResize(width, height);
    });

    observer.observe(element);
    // Ensure initial measurement is captured immediately
    scheduleResize(element.offsetWidth, element.offsetHeight);

    return () => {
      observer.disconnect();
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
      }
      if (dragSettleTimeoutRef.current) {
        window.clearTimeout(dragSettleTimeoutRef.current);
      }
    };
  }, [enabled, scheduleResize, targetRef]);

  const notifyDragStart = useCallback(() => {
    if (dragSettleTimeoutRef.current) {
      window.clearTimeout(dragSettleTimeoutRef.current);
      dragSettleTimeoutRef.current = undefined;
    }
    isDraggingRef.current = true;
  }, []);

  const notifyDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const pendingSize = pendingSizeRef.current;
    pendingSizeRef.current = null;
    if (dragSettleTimeoutRef.current) {
      window.clearTimeout(dragSettleTimeoutRef.current);
    }
    dragSettleTimeoutRef.current = window.setTimeout(() => {
      if (pendingSize) {
        scheduleResize(pendingSize.width, pendingSize.height);
      } else if (targetRef.current && enabled) {
        const { offsetWidth, offsetHeight } = targetRef.current;
        scheduleResize(offsetWidth, offsetHeight);
      }
      dragSettleTimeoutRef.current = undefined;
    }, dragSettleDelayMs);
  }, [dragSettleDelayMs, enabled, scheduleResize, targetRef]);

  const forceResize = useCallback(() => {
    if (!targetRef.current || !enabled) return;
    const { offsetWidth, offsetHeight } = targetRef.current;
    scheduleResize(offsetWidth, offsetHeight);
  }, [enabled, scheduleResize, targetRef]);

  return { notifyDragStart, notifyDragEnd, forceResize };
}
