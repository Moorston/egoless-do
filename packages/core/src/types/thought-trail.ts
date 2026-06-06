// ─── ThoughtTrail types ──────────────────────────────────────────
import type { Syncable } from './shared';

export interface ThoughtTrail extends Syncable {
  id: string;
  name: string;
  description?: string;
  reflectionIds: string[];  // 关联的感念 ID 列表（有序）
  createdAt: number;
  updatedAt: number;
}
