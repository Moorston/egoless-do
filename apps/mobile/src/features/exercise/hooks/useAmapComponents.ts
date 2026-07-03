/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';

let _MapView: any = null;
let _Polyline: any = null;
let _amapLoaded = false;

export function useAmapComponents() {
  const [ready, setReady] = useState(_amapLoaded);
  useEffect(() => {
    if (_amapLoaded) { setReady(true); return; }
    let mounted = true;
    import('react-native-amap3d').then(m => {
      _MapView = m.MapView;
      _Polyline = m.Polyline;
      _amapLoaded = true;
      if (mounted) setReady(true);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  return { MapView: _MapView, Polyline: _Polyline, ready };
}
