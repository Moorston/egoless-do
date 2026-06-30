// ─── Breathing presets & types ───────────────────────────────

export type BreathPhaseType = 'inhale' | 'hold' | 'exhale';
export type GuideStyle = 'scientific' | 'spiritual';

export interface BreathPhase {
  type: BreathPhaseType;
  durationSec: number;
}

export interface BreathingPreset {
  key: string;
  nameKey: string;
  enKey: string;
  ratioKey: string;
  descSciKey: string;
  descSprKey: string;
  tipsSciKey: string;
  tipsSprKey: string;
  phases: BreathPhase[];
  defaultCycles: number;
}

export const BREATHING_PRESETS: BreathingPreset[] = [
  {
    key: 'box',
    nameKey: 'breathBoxName',
    enKey: 'breathBoxEn',
    ratioKey: 'breathBoxRatio',
    descSciKey: 'breathBoxDescSci',
    descSprKey: 'breathBoxDescSpr',
    tipsSciKey: 'breathBoxTipsSci',
    tipsSprKey: 'breathBoxTipsSpr',
    phases: [
      { type: 'inhale', durationSec: 4 },
      { type: 'hold', durationSec: 4 },
      { type: 'exhale', durationSec: 4 },
      { type: 'hold', durationSec: 4 },
    ],
    defaultCycles: 8,
  },
  {
    key: '478',
    nameKey: 'breath478Name',
    enKey: 'breath478En',
    ratioKey: 'breath478Ratio',
    descSciKey: 'breath478DescSci',
    descSprKey: 'breath478DescSpr',
    tipsSciKey: 'breath478TipsSci',
    tipsSprKey: 'breath478TipsSpr',
    phases: [
      { type: 'inhale', durationSec: 4 },
      { type: 'hold', durationSec: 7 },
      { type: 'exhale', durationSec: 8 },
    ],
    defaultCycles: 6,
  },
  {
    key: 'coherent',
    nameKey: 'breathCoherentName',
    enKey: 'breathCoherentEn',
    ratioKey: 'breathCoherentRatio',
    descSciKey: 'breathCoherentDescSci',
    descSprKey: 'breathCoherentDescSpr',
    tipsSciKey: 'breathCoherentTipsSci',
    tipsSprKey: 'breathCoherentTipsSpr',
    phases: [
      { type: 'inhale', durationSec: 5 },
      { type: 'hold', durationSec: 2 },
      { type: 'exhale', durationSec: 5 },
      { type: 'hold', durationSec: 2 },
    ],
    defaultCycles: 8,
  },
];

/** Total seconds for one cycle of a preset */
export function cycleDuration(preset: BreathingPreset): number {
  return preset.phases.reduce((s, p) => s + p.durationSec, 0);
}

/** Phase label i18n key */
export function phaseLabelKey(type: BreathPhaseType): string {
  switch (type) {
    case 'inhale': return 'breathInhale';
    case 'hold': return 'breathHold';
    case 'exhale': return 'breathExhale';
  }
}

/** Get description key based on guide style */
export function getDescKey(preset: BreathingPreset, style: GuideStyle): string {
  return style === 'scientific' ? preset.descSciKey : preset.descSprKey;
}

/** Get tips key based on guide style */
export function getTipsKey(preset: BreathingPreset, style: GuideStyle): string {
  return style === 'scientific' ? preset.tipsSciKey : preset.tipsSprKey;
}
