// ─── react-native-amap3d 类型 shim ─────────────────────────────────
// 该库 package.json 无 types 字段、main 指向 lib/src 源码目录，TS 会直接解析
// 其 .tsx 源码并 type-check，暴露与 React 19 的类型不兼容（supercluster 缺类型、
// GeolocationPosition 未声明、Cluster render / map-view ref 类型冲突）。
// 经 tsconfig paths 把 'react-native-amap3d' 重定向到本 shim，仅作用于类型解析，
// 运行时仍由 Metro 走 node_modules 物理解析，行为不变。
// 覆盖项目实际使用的导出；props 留索引签名兜底。

declare module 'react-native-amap3d' {
  import type { ComponentType, ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';

  export interface LatLng {
    latitude: number;
    longitude: number;
  }

  export interface CameraPosition {
    center: LatLng;
    zoom?: number;
    tilt?: number;
    bearing?: number;
  }

  export interface LatLngBounds {
    southWest: LatLng;
    northEast: LatLng;
  }

  /** moveCamera 的相机参数（项目中以 target 为中心 + zoom） */
  export interface MoveCameraParams {
    target: LatLng;
    zoom?: number;
    tilt?: number;
    bearing?: number;
  }

  /** MapView 实例 ref 暴露的命令式 API */
  export interface MapViewRef {
    moveCamera: (params: MoveCameraParams, duration?: number) => void;
    setCenter?: (latlng: LatLng, zoom?: number, duration?: number) => void;
    takeSnapshot?: () => Promise<string>;
  }

  export interface MapViewProps {
    center?: LatLng;
    zoom?: number;
    cameraPosition?: CameraPosition;
    mapType?: string;
    limits?: { minZoom?: number; maxZoom?: number };
    onLoad?: (e: { nativeEvent: unknown }) => void;
    onCameraMove?: (e: { nativeEvent: { position: CameraPosition } }) => void;
    onPress?: (e: { nativeEvent: { latlng: LatLng } }) => void;
    children?: ReactNode;
    [key: string]: unknown;
  }

  export interface MarkerProps {
    position?: LatLng;
    icon?: unknown;
    onPress?: () => void;
    draggable?: boolean;
    onDragEnd?: (e: { nativeEvent: { position: LatLng } }) => void;
    children?: ReactNode;
    [key: string]: unknown;
  }

  export interface PolylineProps {
    points?: LatLng[];
    color?: string;
    width?: number;
    dashed?: boolean;
    [key: string]: unknown;
  }

  /** AMap SDK 单例（App.tsx 中 AMapSdk.init(key) 初始化） */
  export interface AMapSdk {
    init?: (key: string) => void;
    setCoordinateSystem?: (type: string) => void;
  }

  // MapView 用 ForwardRefExoticComponent 形状，使 React.ElementRef<typeof MapView>
  // 解析为 MapViewRef，从而 mapRef.current?.moveCamera(...) 有类型。
  export const MapView: ForwardRefExoticComponent<
    MapViewProps & RefAttributes<MapViewRef>
  >;
  export const Marker: ComponentType<MarkerProps>;
  export const Polyline: ComponentType<PolylineProps>;
  export const AMapSdk: AMapSdk;
}
