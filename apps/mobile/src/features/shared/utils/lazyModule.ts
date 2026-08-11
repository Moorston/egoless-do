// ─── Lazy Module Loading Utility ─────────────────────────────────────
// 统一处理原生模块的懒加载模式，避免重复的样板代码

import { createLogger } from '@egoless-do/core';

const log = createLogger('LazyModule');

/**
 * 创建懒加载原生模块的 getter 函数
 *
 * @example
 * // 之前：
 * let _Speech: typeof import('expo-speech') | null = null;
 * function getSpeech() {
 *   if (!_Speech) _Speech = require('expo-speech');
 *   return _Speech;
 * }
 *
 * // 之后：
 * const getSpeech = createLazyModule<typeof import('expo-speech')>('expo-speech');
 */
export function createLazyModule<T>(moduleName: string): () => T {
  let cached: T | null = null;
  return () => {
    if (!cached) {
      try {
        cached = require(moduleName) as T;
      } catch (err) {
        log.error(err, { module: moduleName });
        throw err;
      }
    }
    return cached;
  };
}

/**
 * 批量创建多个懒加载模块
 *
 * @example
 * const { Speech, Audio } = createLazyModules<{
 *   Speech: typeof import('expo-speech');
 *   Audio: typeof import('expo-av').Audio;
 * }>({
 *   Speech: 'expo-speech',
 *   Audio: 'expo-av',
 * });
 */
export function createLazyModules<T extends Record<string, unknown>>(
  moduleMap: Record<keyof T, string>
): { [K in keyof T]: () => T[K] } {
  const result = {} as Record<string, () => unknown>;
  for (const [key, moduleName] of Object.entries(moduleMap)) {
    result[key] = createLazyModule(moduleName);
  }
  return result as { [K in keyof T]: () => T[K] };
}
