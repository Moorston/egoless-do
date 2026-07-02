// ─── 止观坐禅灵修文件（Sankalpa）──────────────────────────────
import type { ZhiguanMethod } from '../types';

// ── 发愿模板库（Sankalpa Templates）────────────────────────────

export interface SankalpaTemplate {
  id: string;
  titleKey: string;
  text: string;
}

export const SANKALPA_TEMPLATES: SankalpaTemplate[] = [
  {
    id: 'bodhicitta',
    titleKey: 'zhiguanSankalpaBodhicittaTitle',
    text: '愿以此坐禅功德，普及于一切，我等与众生，皆共成佛道。',
  },
  {
    id: 'renunciation',
    titleKey: 'zhiguanSankalpaRenunciationTitle',
    text: '愿以此功德，远离诸贪著，生死渐解脱，清净如虚空。',
  },
  {
    id: 'compassion',
    titleKey: 'zhiguanSankalpaCompassionTitle',
    text: '愿以此功德，回向诸众生，离苦及苦因，恒住安乐中。',
  },
  {
    id: 'repentance',
    titleKey: 'zhiguanSankalpaRepentanceTitle',
    text: '弟子今日忏悔，尽过去现在未来诸罪障，愿罪皆消灭，心得清净。',
  },
  {
    id: 'gratitude',
    titleKey: 'zhiguanSankalpaGratitudeTitle',
    text: '感恩三宝、父母、师长、众生恩，以此坐禅之心，报四重恩。',
  },
  {
    id: 'general',
    titleKey: 'zhiguanSankalpaGeneralTitle',
    text: '愿以此功德，庄严佛净土，上报四重恩，下济三途苦。',
  },
];

// ── 出定呼吸引导节奏 ────────────────────────────────────────────

export interface BreathPattern {
  inhale: number;   // 秒
  hold: number;     // 秒
  exhale: number;   // 秒
}

export const BREATH_PATTERNS: Record<'standard' | 'closing' | 'calming', BreathPattern> = {
  standard: { inhale: 4, hold: 2, exhale: 6 },   // 默认三段式
  closing:  { inhale: 4, hold: 7, exhale: 8 },   // 出定引导（4-7-8）
  calming:  { inhale: 4, hold: 4, exhale: 4 },   // 均等调息
};

// ── 念处引导（Vipassana Satipaṭṭhana 四念处）────────────────────

export interface VipassanaGuides {
  type: 'kaya' | 'vedana' | 'citta' | 'dharma';
  titleKey: string;
  lines: string[];
}

export const VIPASSANA_GUIDES: VipassanaGuides[] = [
  {
    type: 'kaya',
    titleKey: 'zhiguanVipassanaKayaTitle',
    lines: [
      'zhiguanVipassanaKayaLine1',
      'zhiguanVipassanaKayaLine2',
      'zhiguanVipassanaKayaLine3',
      'zhiguanVipassanaKayaLine4',
      'zhiguanVipassanaKayaLine5',
    ],
  },
  {
    type: 'vedana',
    titleKey: 'zhiguanVipassanaVedanaTitle',
    lines: [
      'zhiguanVipassanaVedanaLine1',
      'zhiguanVipassanaVedanaLine2',
      'zhiguanVipassanaVedanaLine3',
      'zhiguanVipassanaVedanaLine4',
      'zhiguanVipassanaVedanaLine5',
    ],
  },
  {
    type: 'citta',
    titleKey: 'zhiguanVipassanaCittaTitle',
    lines: [
      'zhiguanVipassanaCittaLine1',
      'zhiguanVipassanaCittaLine2',
      'zhiguanVipassanaCittaLine3',
      'zhiguanVipassanaCittaLine4',
      'zhiguanVipassanaCittaLine5',
    ],
  },
  {
    type: 'dharma',
    titleKey: 'zhiguanVipassanaDharmaTitle',
    lines: [
      'zhiguanVipassanaDharmaLine1',
      'zhiguanVipassanaDharmaLine2',
      'zhiguanVipassanaDharmaLine3',
      'zhiguanVipassanaDharmaLine4',
      'zhiguanVipassanaDharmaLine5',
    ],
  },
];

// ── 法门静态元数据表 ──────────────────────────────────────────────

export const METHOD_TABLE: Array<{
  key: ZhiguanMethod;
  labelKey: string;
  descKey: string;
  icon: string;
  defaultSamatha: number;
  defaultVipassana: number;
  openKey: string;
}> = [
  {
    key: 'anapanasati',
    labelKey: 'zhiguanMethodAnapanasati',
    descKey: 'zhiguanMethodAnapanasatiDesc',
    icon: '🌬️',
    defaultSamatha: 100,
    defaultVipassana: 0,
    openKey: 'zhiguanMethodAnapanasatiOpen',
  },
  {
    key: 'self_inquiry',
    labelKey: 'zhiguanMethodSelfInquiry',
    descKey: 'zhiguanMethodSelfInquiryDesc',
    icon: '🔍',
    defaultSamatha: 60,
    defaultVipassana: 40,
    openKey: 'zhiguanMethodSelfInquiryOpen',
  },
  {
    key: 'kasina',
    labelKey: 'zhiguanMethodKasina',
    descKey: 'zhiguanMethodKasinaDesc',
    icon: '🔵',
    defaultSamatha: 100,
    defaultVipassana: 0,
    openKey: 'zhiguanMethodKasinaOpen',
  },
  {
    key: 'metta',
    labelKey: 'zhiguanMethodMetta',
    descKey: 'zhiguanMethodMettaDesc',
    icon: '❤️',
    defaultSamatha: 80,
    defaultVipassana: 20,
    openKey: 'zhiguanMethodMettaOpen',
  },
];
