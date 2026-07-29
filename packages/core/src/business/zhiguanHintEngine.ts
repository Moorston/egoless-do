// ─── 止观 Hint Engine: 五盖 → 对治法推荐 ────────────────────────
// 参考智者大师《小止观·调和第三·调五盖》规则
import type {
  FiveHindranceRadar,
  FiveHindranceKey,
  ZhiguanRecommendation,
  ZhiguanMethod,
} from '../types';
import { ZHIGUAN_METHOD_DEFS } from '../types';

// ─── 规则表（优先级由高到低）───────────────────────────────────

const RULES: Array<{
  hindrance: FiveHindranceKey;
  threshold: number;
  primaryMethod: ZhiguanMethod;
  secondaryMethod?: ZhiguanMethod;
  messageKey: string;
}> = [
  {
    hindrance: 'sloth',
    threshold: 7,
    primaryMethod: 'kasina',      // 经行（以 kasina 代替）
    secondaryMethod: 'anapanasati',
    messageKey: 'zhiguanRuleSloth',
  },
  {
    hindrance: 'restlessness',
    threshold: 7,
    primaryMethod: 'anapanasati',
    messageKey: 'zhiguanRuleRestlessness',
  },
  {
    hindrance: 'greed',
    threshold: 7,
    primaryMethod: 'kasina',      // 不净观以 kasina 代替
    messageKey: 'zhiguanRuleGreed',
  },
  {
    hindrance: 'aversion',
    threshold: 7,
    primaryMethod: 'metta',
    messageKey: 'zhiguanRuleAversion',
  },
  {
    hindrance: 'doubt',
    threshold: 7,
    primaryMethod: 'self_inquiry',
    messageKey: 'zhiguanRuleDoubt',
  },
];

// ─── API ────────────────────────────────────────────────────────

/**
 * 根据五盖雷达图推荐法门
 * @param radar 五维自检得分（0-10）
 * @returns 推荐结果（主推荐 + 备选）
 */
export function recommendMethod(radar: FiveHindranceRadar): ZhiguanRecommendation {
  // 找出最重的一盖
  const entries = Object.entries(radar) as [FiveHindranceKey, number][];
  const maxEntry = entries.reduce((a, b) => a[1] >= b[1] ? a : b);
  const [topHindrance, topScore] = maxEntry;

  // 按优先级匹配规则
  for (const rule of RULES) {
    if (radar[rule.hindrance] >= rule.threshold) {
      const def = ZHIGUAN_METHOD_DEFS.find(d => d.key === rule.primaryMethod);
      return {
        primaryMethod: rule.primaryMethod,
        secondaryMethod: rule.secondaryMethod,
        message: rule.messageKey,
        hindranceTrigger: rule.hindrance,
      };
    }
  }

  // 无显著盖障：推荐默认数息
  return {
    primaryMethod: 'anapanasati',
    message: 'zhiguanRuleDefault',
    hindranceTrigger: topHindrance,
  };
}
