// ─── 移动端配置集中化 ──────────────────────────────────────────────
// 所有硬编码的 fallback URL 集中在此文件，其他模块从此 import。
// ──────────────────────────────────────────────────────────────────

/** Auth API 地址 */
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://egolessdo.freebytes.net';

/** PocketBase 地址（独立于 Auth API） */
export const PB_URL: string =
  process.env.EXPO_PUBLIC_PB_URL
    ?? process.env.EXPO_PUBLIC_POCKETBASE_URL
    ?? API_URL;

/** Expo Project ID */
export const PROJECT_ID: string | undefined = process.env.EXPO_PUBLIC_PROJECT_ID;