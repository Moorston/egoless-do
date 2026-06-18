import { useState, useEffect, useCallback } from 'react';

export function useExerciseRest() {
  const [isResting, setIsResting] = useState(false);
  const [restSec, setRestSec]     = useState(0);

  useEffect(() => {
    if (!isResting) return;
    if (restSec <= 0) {
      setIsResting(false);
      return;
    }
    const t = setTimeout(() => setRestSec(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isResting, restSec]);

  const startRest = useCallback((seconds = 60) => {
    if (seconds <= 0) return;
    setIsResting(true);
    setRestSec(seconds);
  }, []);

  const skipRest = useCallback(() => {
    setIsResting(false);
    setRestSec(0);
  }, []);

  return { isResting, restSec, startRest, skipRest };
}
