// ─── ReflectionLink types ──────────────────────────────────────
import type { Syncable } from './shared';

export type LinkType = 
  | 'inspire'   // 引发/启发
  | 'evolve'    // 演进/深化
  | 'contrast'  // 对比/转折
  | 'respond'   // 回应/反思
  | 'related';  // 相关/类似

export interface ReflectionLink extends Syncable {
  id: string;
  fromId: string;        // 起点感念 ID
  toId: string;          // 终点感念 ID
  type: LinkType;        // 连接类型
  note?: string;         // 用户备注
  createdAt: number;
  updatedAt: number;
}
