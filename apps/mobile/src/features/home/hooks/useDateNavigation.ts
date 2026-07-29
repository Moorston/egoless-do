import { dateStr, addDays } from '@egoless-do/core';
import { useState, useRef, useCallback } from 'react';

/** Date navigation + swipe gesture state. Extracted from HomeScreen. */
export function useDateNavigation() {
  const [viewDate, setViewDate] = useState(dateStr());
  const isToday = viewDate === dateStr();
  const viewDateRef = useRef(viewDate);
  viewDateRef.current = viewDate;

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const goToDate = useCallback((target: string) => {
    setViewDate(target);
  }, []);

  const onTouchStart = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    touchStartX.current = e.nativeEvent.pageX;
    touchStartY.current = e.nativeEvent.pageY;
  }, []);

  const onTouchEnd = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    const dx = e.nativeEvent.pageX - touchStartX.current;
    const dy = e.nativeEvent.pageY - touchStartY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) {
        const nextDate = addDays(viewDateRef.current, 1);
        if (nextDate <= dateStr()) setViewDate(nextDate);
      } else {
        setViewDate(addDays(viewDateRef.current, -1));
      }
    }
  }, []);

  return { viewDate, isToday, goToDate, onTouchStart, onTouchEnd, viewDateRef };
}