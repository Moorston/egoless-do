'use client';

import { useEffect, useRef } from 'react';
import { loadAMap } from '../lib/amapLoader';

interface AmapContainerProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  style?: React.CSSProperties;
  onMapReady?: (map: any) => void;
}

export default function AmapContainer({
  center = [116.4074, 39.9042],
  zoom = 13,
  className,
  style,
  onMapReady,
}: AmapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    loadAMap().then((AMap) => {
      const map = new AMap.Map(containerRef.current!, {
        zoom,
        center,
        resizeEnable: true,
        touchZoom: true,
        scrollWheel: true,
      });
      mapRef.current = map;
      onMapReady?.(map);
    });

    return () => {
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%', ...style }}
    />
  );
}
