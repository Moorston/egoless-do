// ─── AI 结果缓存 ────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  createdAt: number;
}

/**
 * 内存缓存类，支持 TTL 和 LRU 淘汰
 */
export class AICache<T = any> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(ttlMs: number = 5 * 60 * 1000, maxSize: number = 50) {
    this.ttl = ttlMs;
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.createdAt > this.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    // 如果已存在，先删除再插入（保持顺序）
    this.store.delete(key);

    // 容量满时淘汰最旧条目
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(key, { value, createdAt: Date.now() });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.store.clear();
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  get size(): number {
    return this.store.size;
  }
}

/**
 * 生成缓存键：基于查询内容和感念 ID 集合的哈希
 * 取 SHA-256 前 16 位十六进制字符串
 */
export function generateCacheKey(query: string, reflectionIds: string[]): string {
  const sortedIds = [...reflectionIds].sort().join(',');
  const raw = `${query}|${sortedIds}`;
  return simpleHash(raw);
}

/**
 * 简单哈希函数（无需 crypto 依赖）
 * 使用 DJB2 算法生成 64 位哈希，转为 16 位十六进制
 */
function simpleHash(str: string): string {
  let hash1 = 5381;
  let hash2 = 5381;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1 + char) & 0xffffffff;
    hash2 = ((hash2 << 7) + hash2 + char) & 0xffffffff;
  }

  // 组合两个 32 位哈希为 64 位，取前 16 位十六进制
  const combined = (BigInt(hash1) << 32n) | BigInt(hash2 >>> 0);
  return combined.toString(16).padStart(16, '0').slice(0, 16);
}
