// ─── Zhiguan (止观双修) types ───────────────────────────────────
// 基于智者大师《小止观》四阶段环绕模型：
//   发愿 (Preparation) → 入定 (Practice·Samatha) → 观照 (Practice·Vipassana) → 回向 (Closing)
//
// 设计原则：
//   - 定阶位次仅自述，系统不推算（见 design.md D5）
//   - 八触觉受可多选，不弹确认（见 design.md D6）
//   - 所有时间戳使用 Unix ms，本地存储，不上传（见 constitution·隐私优先）

import type { Syncable } from './shared';

// ─── 核心枚举 ────────────────────────────────────────────────

/** 坐禅内部阶段路由（单页 3 段模式，见 design.md D1） */
export type ZhiguanStage = 'preparation' | 'practice' | 'closing';

/** 止观法门（设计 docs / design.md D2） */
export type ZhiguanMethod = 'anapanasati' | 'self_inquiry' | 'kasina' | 'metta';

/** 法门元数据（用于 MethodPicker UI 展示） */
export interface ZhiguanMethodDef {
  key: ZhiguanMethod;
  labelKey: string;        // i18n key
  descKey: string;         // i18n key (短描述)
  icon: string;            // emoji 如 🌬️
  defaultSamathaRatio: number; // 默认定侧百分比
  defaultVipassanaRatio: number;
}

export const ZHIGUAN_METHOD_DEFS: ZhiguanMethodDef[] = [
  {
    key: 'anapanasati',
    labelKey: 'zhiguanMethodAnapanasati',
    descKey: 'zhiguanMethodAnapanasatiDesc',
    icon: '🌬️',
    defaultSamathaRatio: 100,
    defaultVipassanaRatio: 0,
  },
  {
    key: 'self_inquiry',
    labelKey: 'zhiguanMethodSelfInquiry',
    descKey: 'zhiguanMethodSelfInquiryDesc',
    icon: '🔍',
    defaultSamathaRatio: 60,
    defaultVipassanaRatio: 40,
  },
  {
    key: 'kasina',
    labelKey: 'zhiguanMethodKasina',
    descKey: 'zhiguanMethodKasinaDesc',
    icon: '🔵',
    defaultSamathaRatio: 100,
    defaultVipassanaRatio: 0,
  },
  {
    key: 'metta',
    labelKey: 'zhiguanMethodMetta',
    descKey: 'zhiguanMethodMettaDesc',
    icon: '❤️',
    defaultSamathaRatio: 80,
    defaultVipassanaRatio: 20,
  },
];

/** 坐禅记录状态 */
export type ZhiguanStatus = 'in_progress' | 'completed' | 'interrupted' | 'draft';

// ─── 五盖（Pañca Nīvaraṇāni）──────────────────────────────────

export type FiveHindranceKey = 'greed' | 'aversion' | 'sloth' | 'restlessness' | 'doubt';

/** 五维自检得分（0-10，0=无，10=极重） */
export type FiveHindranceRadar = Record<FiveHindranceKey, number>;

export const FIVE_HINDRANCE_KEYS: FiveHindranceKey[] = [
  'greed', 'aversion', 'sloth', 'restlessness', 'doubt',
];

export const FIVE_HINDRANCE_LABEL_KEYS: Record<FiveHindranceKey, string> = {
  greed:          'zhiguanHindranceGreed',
  aversion:       'zhiguanHindranceAversion',
  sloth:          'zhiguanHindranceSloth',
  restlessness:   'zhiguanHindranceRestlessness',
  doubt:          'zhiguanHindranceDoubt',
};

export const DEFAULT_RADAR: FiveHindranceRadar = {
  greed: 3,
  aversion: 3,
  sloth: 3,
  restlessness: 3,
  doubt: 3,
};

// ─── 八触（Aṣṭa Sparśa）───────────────────────────────────────

export type EightTactileKey =
  | 'movement' | 'itching' | 'cold' | 'warmth'
  | 'lightness' | 'heaviness' | 'roughness' | 'smoothness';

/** 八触觉受记录（可多选，见 design.md D6） */
export type EightTactile = Record<EightTactileKey, boolean>;

export const EIGHT_TACTILE_KEYS: EightTactileKey[] = [
  'movement', 'itching', 'cold', 'warmth',
  'lightness', 'heaviness', 'roughness', 'smoothness',
];

export const EIGHT_TACTILE_LABEL_KEYS: Record<EightTactileKey, string> = {
  movement:   'zhiguanTactileMovement',
  itching:    'zhiguanTactileItching',
  cold:       'zhiguanTactileCold',
  warmth:     'zhiguanTactileWarmth',
  lightness:  'zhiguanTactileLightness',
  heaviness:  'zhiguanTactileHeaviness',
  roughness:  'zhiguanTactileRoughness',
  smoothness: 'zhiguanTactileSmoothness',
};

export const EMPTY_EIGHT_TACTILE: EightTactile = {
  movement: false, itching: false, cold: false, warmth: false,
  lightness: false, heaviness: false, roughness: false, smoothness: false,
};

// ─── 定阶位次（仅自述）──────────────────────────────────────────

/**
 * 定阶位次枚举
 * ⚠️ 系统不推算位次，仅存储用户自述（见 design.md D5）
 */
export type SamStage =
  | 'not_specified'   // 默认"我不确定"
  | 'scattered'       // 散心
  | 'desire_realm'    // 欲界定
  | 'preparation'     // 未到地定（初禅方便）
  | 'first_jhana'     // 初禅
  | 'second_jhana'    // 二禅
  | 'third_jhana'     // 三禅
  | 'fourth_jhana'    // 四禅
  | 'other';          // 自由文本

export const SAM_STAGE_LABEL_KEYS: Record<SamStage, string> = {
  not_specified:  'zhiguanStageNotSpecified',
  scattered:      'zhiguanStageScattered',
  desire_realm:   'zhiguanStageDesireRealm',
  preparation:    'zhiguanStagePreparation',
  first_jhana:    'zhiguanStageFirstJhana',
  second_jhana:   'zhiguanStageSecondJhana',
  third_jhana:    'zhiguanStageThirdJhana',
  fourth_jhana:   'zhiguanStageFourthJhana',
  other:          'zhiguanStageOther',
};

// ─── 坐禅 session（核心持久化实体） ──────────────────────────────

export interface ZhiguanSession extends Syncable {
  id: string;
  userId: string;            // 匿名哈希（不暴露真实身份）

  status: ZhiguanStatus;

  // ── 阶段 ① 发愿 ──
  startTs: number;          // 进入 preparation 的时间戳（ms）
  endTs?: number;           // 结束（closing 完成）的时间戳（ms）
  sankalpa?: string;        // 发愿文本（留空即无发愿）
  preliminaryLevel: 'minimal' | 'recommended' | 'full'; // 二十五方便采用模式
  fiveHindrances: FiveHindranceRadar;

  // ── 阶段 ②③ 止观 ──
  chosenMethod: ZhiguanMethod;
  samathaRatioAvg?: number;     // 滑竿均值（系统统计非成就）
  vipassanaRatioAvg?: number;
  totalBreaths?: number;        // 累计息数（辅助而非成就）

  // ── 阶段 ④ 回向 ──
  closingNotes?: string;        // 觉受文字
  eightTactile: EightTactile;
  selfReportedStage?: SamStage;
  selfReportedStageText?: string; // "other" 时的自由文本

  // ── 关联 ──
  dedicationId?: string;         // 关联 vow 模块的回向 ID

  // ── 元数据（供未来扩展） ──
  meta?: {
    interrupted?: boolean;       // 是否中途退出
    interruptedReason?: string;  // 中断原因（如电话、崩溃）
    elapsedBeforeInterruptionMs?: number;
  };
}

// ─── Draft 状态（禅修前的准备态，不入库，仅内存） ──────────────────

export interface ZhiguanDraft {
  sankalpa?: string;
  preliminaryLevel: 'minimal' | 'recommended' | 'full';
  fiveHindrances: FiveHindranceRadar;
  chosenMethod?: ZhiguanMethod;
  samathaRatio: number;
  vipassanaRatio: number;
  // 意图设定（阶段①完成时确认）
  intentConfirmedTs?: number;
}

// ─── 履历统计（用于 History 面板） ──────────────────────────────

export interface ZhiguanStats {
  totalSessions: number;
  totalMinutes: number;
  longestMinutes: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastSessionDate?: string;        // YYYY-MM-DD
  methodDistribution: Partial<Record<ZhiguanMethod, number>>;
}

// ─── 推荐法门结果（zhiguanHintEngine 输出） ─────────────────────

export interface ZhiguanRecommendation {
  primaryMethod: ZhiguanMethod;
  secondaryMethod?: ZhiguanMethod;
  message: string;                // 经文式引用（来自 design.md 规则表）
  hindranceTrigger: FiveHindranceKey; // 触发这次推荐的最重盖
}
