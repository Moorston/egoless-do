'use client';

import { useState, useEffect } from 'react';

const BREAKPOINT_MOBILE = 390;
const BREAKPOINT_TABLET = 768;
const BREAKPOINT_DESKTOP = 1024;
const BREAKPOINT_WIDE = 1200;

export function useResponsive() {
  const [width, setWidth] = useState(BREAKPOINT_MOBILE);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    setWidth(window.innerWidth);
    let raf: number;
    const handleResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setWidth(window.innerWidth)); };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', handleResize); };
  }, []);
  
  return {
    isMobile: !mounted || width < BREAKPOINT_TABLET,
    isTablet: mounted && width >= BREAKPOINT_TABLET && width < BREAKPOINT_DESKTOP,
    isDesktop: mounted && width >= BREAKPOINT_DESKTOP,
    width,
    maxWidth: width < BREAKPOINT_TABLET ? BREAKPOINT_MOBILE : width < BREAKPOINT_DESKTOP ? BREAKPOINT_TABLET : BREAKPOINT_WIDE,
  };
}
