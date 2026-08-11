// ─── 音乐缓存服务 ──────────────────────────────────────────────────
// 提供智能缓存，减少 API 调用，支持离线浏览

import { File, Directory, Paths } from 'expo-file-system';
import { createLogger } from '@egoless-do/core';

import type { CatalogTrack, MusicCategory } from './MusicCatalogService';

const log = createLogger('MusicCache');

// 缓存配置
const CACHE_CONFIG = {
  // 缓存目录
  dir: new Directory(Paths.document, 'music-cache'),

  // TTL 配置（毫秒）
  ttl: {
    search: 60 * 60 * 1000,      // 搜索结果: 1 小时
    category: 24 * 60 * 60 * 1000, // 分类列表: 24 小时
    detail: 7 * 24 * 60 * 60 * 1000, // 音乐详情: 7 天
  },

  // 最大缓存条目数
  maxEntries: 100,
};

// 缓存条目接口
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// 缓存统计
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

class MusicCacheService {
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };

  // 初始化缓存目录
  async initialize(): Promise<void> {
    try {
      if (!CACHE_CONFIG.dir.exists) {
        CACHE_CONFIG.dir.create({ intermediates: true });
      }
      // 加载磁盘缓存到内存
      await this.loadDiskCache();
    } catch (error) {
      log.warn('缓存初始化失败:', error);
    }
  }

  // 获取缓存
  async get<T>(key: string): Promise<T | null> {
    // 1. 检查内存缓存
    const memEntry = this.memoryCache.get(key);
    if (memEntry && !this.isExpired(memEntry)) {
      this.stats.hits++;
      return memEntry.data as T;
    }

    // 2. 检查磁盘缓存
    try {
      const diskEntry = await this.loadFromDisk<T>(key);
      if (diskEntry && !this.isExpired(diskEntry)) {
        // 加载到内存缓存
        this.memoryCache.set(key, diskEntry);
        this.stats.hits++;
        return diskEntry.data;
      }
    } catch (error) {
      log.warn('磁盘缓存读取失败:', error);
    }

    this.stats.misses++;
    return null;
  }

  // 设置缓存
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || CACHE_CONFIG.ttl.search,
    };

    // 1. 写入内存缓存
    this.memoryCache.set(key, entry);
    this.stats.size = this.memoryCache.size;

    // 2. 异步写入磁盘缓存
    void this.saveToDisk(key, entry);

    // 3. 清理过期缓存
    await this.cleanup();
  }

  // 搜索结果缓存键
  static searchKey(query: string, page: number = 1): string {
    return `search:${query.toLowerCase().trim()}:p${page}`;
  }

  // 分类缓存键
  static categoryKey(category: MusicCategory): string {
    return `category:${category}`;
  }

  // 缓存搜索结果
  async cacheSearchResults(query: string, results: CatalogTrack[], page: number = 1): Promise<void> {
    const key = MusicCacheService.searchKey(query, page);
    await this.set(key, results, CACHE_CONFIG.ttl.search);
  }

  // 获取缓存的搜索结果
  async getCachedSearchResults(query: string, page: number = 1): Promise<CatalogTrack[] | null> {
    const key = MusicCacheService.searchKey(query, page);
    return this.get<CatalogTrack[]>(key);
  }

  // 缓存分类结果
  async cacheCategoryResults(category: MusicCategory, results: CatalogTrack[]): Promise<void> {
    const key = MusicCacheService.categoryKey(category);
    await this.set(key, results, CACHE_CONFIG.ttl.category);
  }

  // 获取缓存的分类结果
  async getCachedCategoryResults(category: MusicCategory): Promise<CatalogTrack[] | null> {
    const key = MusicCacheService.categoryKey(category);
    return this.get<CatalogTrack[]>(key);
  }

  // 检查是否过期
  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  // 从磁盘加载缓存
  private async loadFromDisk<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const file = new File(CACHE_CONFIG.dir, `${this.hashKey(key)}.json`);
      if (!file.exists) return null;

      const content = await file.text();
      return JSON.parse(content) as CacheEntry<T>;
    } catch {
      return null;
    }
  }

  // 保存到磁盘
  private async saveToDisk<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const file = new File(CACHE_CONFIG.dir, `${this.hashKey(key)}.json`);
      file.write(JSON.stringify(entry));
    } catch (error) {
      log.warn('磁盘缓存写入失败:', error);
    }
  }

  // 加载磁盘缓存到内存
  private async loadDiskCache(): Promise<void> {
    try {
      const files = CACHE_CONFIG.dir.list();
      let loaded = 0;

      for (const file of files) {
        if (!(file instanceof File) || !file.name.endsWith('.json')) continue;

        try {
          const content = await file.text();
          const entry = JSON.parse(content) as CacheEntry<unknown>;

          // 只加载未过期的缓存
          if (!this.isExpired(entry)) {
            // 从文件名恢复 key（简化处理，实际应该有映射）
            this.memoryCache.set(file.name.replace('.json', ''), entry);
            loaded++;
          }
        } catch {
          // 忽略损坏的缓存文件
        }
      }

      this.stats.size = this.memoryCache.size;
      log.info(`加载了 ${loaded} 个缓存条目`);
    } catch (error) {
      log.warn('加载磁盘缓存失败:', error);
    }
  }

  // 清理过期缓存
  private async cleanup(): Promise<void> {
    // 内存缓存清理
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    }

    // 限制缓存大小
    if (this.memoryCache.size > CACHE_CONFIG.maxEntries) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      // 删除最旧的条目
      const toDelete = entries.slice(0, entries.length - CACHE_CONFIG.maxEntries);
      for (const [key] of toDelete) {
        this.memoryCache.delete(key);
      }
    }

    this.stats.size = this.memoryCache.size;
  }

  // 哈希键名（用于文件名）
  private hashKey(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为 32 位整数
    }
    return Math.abs(hash).toString(36);
  }

  // 获取缓存统计
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // 清除所有缓存
  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    this.stats = { hits: 0, misses: 0, size: 0 };

    try {
      const files = CACHE_CONFIG.dir.list();
      for (const file of files) {
        if (file.name.endsWith('.json')) {
          const f = new File(CACHE_CONFIG.dir, file.name);
          if (f.exists) f.delete();
        }
      }
    } catch (error) {
      log.warn('清除磁盘缓存失败:', error);
    }
  }
}

// 单例实例
export const musicCacheService = new MusicCacheService();
