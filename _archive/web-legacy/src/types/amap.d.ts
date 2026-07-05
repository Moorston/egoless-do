declare namespace AMap {
  class Map {
    constructor(container: string | HTMLElement, opts?: MapOptions);
    add(overlay: any): void;
    remove(overlay: any): void;
    setCenter(center: [number, number]): void;
    setZoom(zoom: number): void;
    setFitView(overlays?: any[], immediately?: boolean, margins?: number[]): void;
    destroy(): void;
  }

  interface MapOptions {
    zoom?: number;
    center?: [number, number];
    resizeEnable?: boolean;
    touchZoom?: boolean;
    scrollWheel?: boolean;
    dragEnable?: boolean;
    mapStyle?: string;
  }

  class Polyline {
    constructor(opts?: PolylineOptions);
    setPath(path: [number, number][]): void;
    setOptions(opts: Partial<PolylineOptions>): void;
  }

  interface PolylineOptions {
    path?: [number, number][];
    strokeColor?: string;
    strokeWeight?: number;
    strokeOpacity?: number;
    lineJoin?: string;
    lineCap?: string;
    showDir?: boolean;
  }

  class CircleMarker {
    constructor(opts?: CircleMarkerOptions);
    on(event: string, handler: () => void): void;
  }

  interface CircleMarkerOptions {
    center?: [number, number];
    radius?: number;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWeight?: number;
    cursor?: string;
    zIndex?: number;
  }

  class Marker {
    constructor(opts?: MarkerOptions);
    on(event: string, handler: () => void): void;
  }

  interface MarkerOptions {
    position?: [number, number];
    content?: string;
    offset?: Pixel;
  }

  class Pixel {
    constructor(x: number, y: number);
  }
}

declare module '@amap/amap-jsapi-loader' {
  interface LoadOptions {
    key: string;
    version?: string;
    plugins?: string[];
  }
  function load(options: LoadOptions): Promise<typeof AMap>;
  export default { load };
}
