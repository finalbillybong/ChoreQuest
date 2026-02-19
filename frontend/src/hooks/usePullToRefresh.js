import { useState, useRef, useCallback, useEffect } from 'react';

const THRESHOLD = 80; // px to pull before triggering refresh
const MAX_PULL = 120; // max visual pull distance

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    // Only activate when scrolled to top
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff < 0) {
      // Scrolling up, not pulling down
      isPulling.current = false;
      setPulling(false);
      setPullDistance(0);
      return;
    }

    if (diff > 10) {
      setPulling(true);
      // Apply resistance: the further you pull, the harder it gets
      const distance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(distance);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= THRESHOLD * 0.5) {
      setRefreshing(true);
      setPullDistance(0);
      setPulling(false);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullDistance(0);
      setPulling(false);
    }
  }, [pullDistance, onRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pulling, pullDistance, refreshing };
}
