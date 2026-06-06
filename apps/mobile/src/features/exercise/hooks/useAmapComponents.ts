import { useState, useEffect } from 'react';

let _MapView: any = null;
let _Polyline: any = null;
let _amapLoaded = false;

export function useAmapComponents() {
  const [ready, setReady] = useState(_amapLoaded);
  useEffect(() => {
    if (_amapLoaded) { setReady(true); return; }
    import('react-native-amap3d').then(m => {
      _MapView = m.MapView;
      _Polyline = m.Polyline;
      _amapLoaded = true;
      setReady(true);
    }).catch(() => {});
  }, []);
  return { MapView: _MapView, Polyline: _Polyline, ready };
}
