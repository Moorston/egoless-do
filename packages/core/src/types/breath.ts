import type { Syncable } from './shared';

export interface BreathingRecord extends Syncable {
  id: string;
  date: string;           // YYYY-MM-DD
  presetKey: string;      // 'box', '478', '488', 'ujjayi'
  durationSec: number;    // total elapsed seconds
  cycles: number;         // completed cycles
  preDistress: number;    // 0-10
  postDistress: number;   // 0-10
  reflection?: string;    // optional user reflection
  guideStyle: 'scientific' | 'spiritual';
}
