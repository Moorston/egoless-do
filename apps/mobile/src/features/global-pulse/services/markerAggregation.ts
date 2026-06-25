/**
 * 标记聚合算法
 * 在低缩放级别时合并密集区域的标记
 */

import { GlobalCheckin, ClusterMarker } from '../types/globalPulse';

// 聚合阈值（像素）
const CLUSTER_THRESHOLD_PX = 20;

// 缩放级别与网格大小的映射
const ZOOM_GRID_SIZE: Record<number, number> = {
  1: 100,   // 100km
  2: 80,
  3: 60,
  4: 40,
  5: 20,    // 20km
  6: 10,
  7: 5,
  8: 2,
  9: 1,     // 1km
  10: 0.5,
  11: 0.2,
  12: 0.1,
  13: 0.05,
  14: 0.02,
  15: 0.01,
};

/**
 * 获取网格大小（公里）
 */
function getGridSize(zoom: number): number {
  if (zoom <= 1) return 100;
  if (zoom >= 15) return 0.01;
  return ZOOM_GRID_SIZE[zoom] || 1;
}

/**
 * 将坐标转换为网格 ID
 */
function getGridId(lat: number, lng: number, gridSize: number): string {
  const gridLat = Math.floor(lat / gridSize) * gridSize;
  const gridLng = Math.floor(lng / gridSize) * gridSize;
  return `${gridLat.toFixed(4)}_${gridLng.toFixed(4)}`;
}

/**
 * 计算聚合中心点
 */
function calculateClusterCenter(checkins: GlobalCheckin[]): { lat: number; lng: number } {
  if (checkins.length === 0) return { lat: 0, lng: 0 };

  const sum = checkins.reduce(
    (acc, checkin) => ({
      lat: acc.lat + checkin.lat,
      lng: acc.lng + checkin.lng
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / checkins.length,
    lng: sum.lng / checkins.length
  };
}

/**
 * 聚合标记
 * @param checkins 打卡记录列表
 * @param zoom 当前缩放级别
 * @returns 聚合后的标记列表
 */
export function aggregateMarkers(
  checkins: GlobalCheckin[],
  zoom: number
): ClusterMarker[] {
  // 标记数量少或高缩放级别时不聚合
  if (checkins.length <= 50 || zoom >= 10) {
    return checkins.map(checkin => ({
      id: checkin.checkin_id,
      lat: checkin.lat,
      lng: checkin.lng,
      count: 1,
      checkins: [checkin]
    }));
  }

  const gridSize = getGridSize(zoom);
  const clusters = new Map<string, GlobalCheckin[]>();

  // 按网格分组
  for (const checkin of checkins) {
    const gridId = getGridId(checkin.lat, checkin.lng, gridSize);
    if (!clusters.has(gridId)) {
      clusters.set(gridId, []);
    }
    clusters.get(gridId)!.push(checkin);
  }

  // 生成聚合标记
  const result: ClusterMarker[] = [];

  for (const [gridId, gridCheckins] of clusters) {
    if (gridCheckins.length === 1) {
      // 单个标记不聚合
      result.push({
        id: gridCheckins[0].checkin_id,
        lat: gridCheckins[0].lat,
        lng: gridCheckins[0].lng,
        count: 1,
        checkins: gridCheckins
      });
    } else {
      // 多个标记聚合
      const center = calculateClusterCenter(gridCheckins);
      result.push({
        id: `cluster_${gridId}`,
        lat: center.lat,
        lng: center.lng,
        count: gridCheckins.length,
        checkins: gridCheckins
      });
    }
  }

  return result;
}

/**
 * 检查两个标记是否应该聚合
 */
export function shouldCluster(
  marker1: { lat: number; lng: number },
  marker2: { lat: number; lng: number },
  zoom: number,
  screenWidth: number
): boolean {
  const gridSize = getGridSize(zoom);
  const grid1 = getGridId(marker1.lat, marker1.lng, gridSize);
  const grid2 = getGridId(marker2.lat, marker2.lng, gridSize);
  return grid1 === grid2;
}

/**
 * 获取聚合标记的样式
 */
export function getClusterStyle(count: number): {
  size: number;
  color: string;
  fontSize: number;
} {
  if (count >= 100) {
    return { size: 60, color: '#EF4444', fontSize: 14 };
  }
  if (count >= 50) {
    return { size: 50, color: '#F59E0B', fontSize: 13 };
  }
  if (count >= 20) {
    return { size: 44, color: '#10B981', fontSize: 12 };
  }
  if (count >= 10) {
    return { size: 38, color: '#3B82F6', fontSize: 11 };
  }
  return { size: 32, color: '#6366F1', fontSize: 10 };
}
