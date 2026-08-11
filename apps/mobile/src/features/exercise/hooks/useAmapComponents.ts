import { useState, useEffect, type ComponentType } from 'react';

let _MapView: ComponentType<Record<string, unknown>> | null = null;
let _Polyline: ComponentType<Record<string, unknown>> | null = null;
let _amapLoaded = false;

export function useAmapComponents() {
  const [ready, setReady] = useState(_amapLoaded);
  useEffect(() => {
    if (_amapLoaded) { setReady(true); return; }
    let mounted = true;
    import('react-native-amap3d').then(m => {
      _MapView = m.MapView as unknown as ComponentType<Record<string, unknown>>;
      _Polyline = m.Polyline as unknown as ComponentType<Record<string, unknown>>;
      _amapLoaded = true;
      if (mounted) setReady(true);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  return { MapView: _MapView, Polyline: _Polyline, ready };
}
