'use client';

import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import type { SportItem } from '@egoless/core';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function GpsTrackMap({ sport, onClose }: { sport: SportItem; onClose: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const watchId = useRef<number | null>(null);
  const path = useRef<[number, number][]>([]);

  const [tracking, setTracking] = useState(false);
  const [sec, setSec] = useState(0);
  const [dist, setDist] = useState(0);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([39.9, 116.4], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstance.current = map;

    const icon = L.divIcon({
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#22C55E;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    markerRef.current = L.marker([39.9, 116.4], { icon }).addTo(map);

    polylineRef.current = L.polyline([], { color: '#22C55E', weight: 4, opacity: 0.8 }).addTo(map);

    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  const startTracking = () => {
    if (!mapInstance.current) return;
    setStarted(true);
    setTracking(true);
    path.current = [];
    setDist(0);
    setSec(0);

    intervalRef.current = setInterval(() => setSec((s) => s + 1), 1000);

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const map = mapInstance.current;
        if (!map) return;

        map.setView([lat, lng], 15);

        markerRef.current?.setLatLng([lat, lng]);

        if (path.current.length > 0) {
          const last = path.current[path.current.length - 1];
          setDist((d) => d + haversine(last[0], last[1], lat, lng));
        }
        path.current.push([lat, lng]);
        polylineRef.current?.setLatLngs(path.current as unknown as L.LatLngExpression[]);
      },
      (err) => console.warn('GPS error:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
  };

  const pauseTracking = () => {
    setTracking(false);
    clearInterval(intervalRef.current);
    if (watchId.current !== null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
  };

  const stopTracking = () => {
    pauseTracking();
    setStarted(false);
  };

  useEffect(() => () => { clearInterval(intervalRef.current); if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div ref={mapRef} style={{ flex: 1, position: 'relative' }} />

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(180deg,rgba(0,0,0,.6),transparent)', zIndex: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{sport.icon}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{sport.key}</span>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(0,0,0,.5)', border: 'none', color: '#fff', fontSize: 18, width: 34, height: 34, borderRadius: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>

      {/* Stats overlay */}
      <div style={{ position: 'absolute', top: 56, left: 16, right: 16, display: 'flex', gap: 12, zIndex: 400 }}>
        <div style={{ flex: 1, background: 'rgba(0,0,0,.65)', borderRadius: 14, padding: '10px 14px', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>时长</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 2 }}>{formatTime(sec)}</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(0,0,0,.65)', borderRadius: 14, padding: '10px 14px', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>距离</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 2 }}>{(dist / 1000).toFixed(2)}<span style={{ fontSize: 12, fontWeight: 400 }}> km</span></div>
        </div>
        <div style={{ flex: 1, background: 'rgba(0,0,0,.65)', borderRadius: 14, padding: '10px 14px', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>配速</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 2 }}>
            {dist > 0 ? `${Math.floor(sec / (dist / 1000))}:${String(Math.floor((sec / (dist / 1000)) % 60)).padStart(2, '0')}` : '--'}<span style={{ fontSize: 12, fontWeight: 400 }}> /km</span>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 24px 36px', display: 'flex', justifyContent: 'center', gap: 24, background: 'linear-gradient(0deg,rgba(0,0,0,.7),transparent)', zIndex: 400 }}>
        {!started ? (
          <button onClick={startTracking}
            style={{ width: 72, height: 72, borderRadius: 36, background: '#22C55E', border: 'none', fontSize: 16, fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(34,197,94,.4)' }}>
            GO
          </button>
        ) : (
          <>
            <button onClick={stopTracking}
              style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ■
            </button>
            <button onClick={() => tracking ? pauseTracking() : startTracking()}
              style={{ width: 72, height: 72, borderRadius: 36, background: tracking ? '#fff' : '#22C55E', border: 'none', fontSize: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tracking ? '#333' : '#fff', boxShadow: tracking ? 'none' : '0 4px 20px rgba(34,197,94,.4)' }}>
              {tracking ? '⏸' : '▶'}
            </button>
            <button onClick={onClose}
              style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}
