import type { Syncable } from './shared';

export type GiveType = 'material' | 'dharma' | 'fearless';

export interface GiveEntry extends Syncable {
  id: string;
  timestamp: number;
  type: GiveType;
  content: string;
  motivation?: string;
  anonymous: boolean;
  amount?: number;
  reflectionId?: string;
}

export const GIVE_TYPE_CONFIG: Record<GiveType, { icon: string; labelKey: string; color: string }> = {
  material: { icon: '💰', labelKey: 'giveMaterial', color: '#F59E0B' },
  dharma: { icon: '📖', labelKey: 'giveDharma', color: '#3B82F6' },
  fearless: { icon: '🛡', labelKey: 'giveFearless', color: '#10B981' },
};
