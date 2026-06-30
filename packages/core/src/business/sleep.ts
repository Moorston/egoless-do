// ─── Sleep & Body Clock utilities ──────────────────────────

/** 中医十二时辰数据 */
export interface BodyClockPeriod {
  key: string;           // 子、丑、寅...
  nameKey: string;       // i18n key (暂用中文直接)
  nameZh: string;        // 中文名
  startHour: number;     // 开始小时 (24h)
  organ: string;         // 对应脏腑
  organEn: string;       // 英文脏腑名
  advice: string;        // 修行建议
  adviceEn: string;      // 英文建议
}

export const BODY_CLOCK: BodyClockPeriod[] = [
  { key: 'zi', nameKey: '子时', nameZh: '子时', startHour: 23, organ: '胆经', organEn: 'Gallbladder', advice: '阳气初生，宜入睡', adviceEn: 'Yang rises, best time to sleep' },
  { key: 'chou', nameKey: '丑时', nameZh: '丑时', startHour: 1, organ: '肝经', organEn: 'Liver', advice: '深度睡眠，肝血归经', adviceEn: 'Deep sleep, liver detoxifies' },
  { key: 'yin', nameKey: '寅时', nameZh: '寅时', startHour: 3, organ: '肺经', organEn: 'Lung', advice: '气血重新分配', adviceEn: 'Qi redistributes' },
  { key: 'mao', nameKey: '卯时', nameZh: '卯时', startHour: 5, organ: '大肠经', organEn: 'Large Intestine', advice: '阳气升发，宜起床', adviceEn: 'Yang rises, good time to wake' },
  { key: 'chen', nameKey: '辰时', nameZh: '辰时', startHour: 7, organ: '胃经', organEn: 'Stomach', advice: '宜进食', adviceEn: 'Best time for breakfast' },
  { key: 'si', nameKey: '巳时', nameZh: '巳时', startHour: 9, organ: '脾经', organEn: 'Spleen', advice: '消化吸收高峰', adviceEn: 'Peak digestion' },
  { key: 'wu', nameKey: '午时', nameZh: '午时', startHour: 11, organ: '心经', organEn: 'Heart', advice: '宜小憩 15 分钟', adviceEn: 'Good for a short nap' },
  { key: 'wei', nameKey: '未时', nameZh: '未时', startHour: 13, organ: '小肠经', organEn: 'Small Intestine', advice: '吸收营养', adviceEn: 'Nutrient absorption' },
  { key: 'shen', nameKey: '申时', nameZh: '申时', startHour: 15, organ: '膀胱经', organEn: 'Bladder', advice: '适合运动', adviceEn: 'Good for exercise' },
  { key: 'you', nameKey: '酉时', nameZh: '酉时', startHour: 17, organ: '肾经', organEn: 'Kidney', advice: '肾气充盈', adviceEn: 'Kidney energy peaks' },
  { key: 'xu', nameKey: '戌时', nameZh: '戌时', startHour: 19, organ: '心包经', organEn: 'Pericardium', advice: '宜放松，不宜剧烈运动', adviceEn: 'Relax, avoid intense exercise' },
  { key: 'hai', nameKey: '亥时', nameZh: '亥时', startHour: 21, organ: '三焦经', organEn: 'Triple Burner', advice: '百脉通泰，宜静心准备入睡', adviceEn: 'Prepare for sleep' },
];

/** 获取当前时辰 */
export function getCurrentPeriod(): BodyClockPeriod {
  const hour = new Date().getHours();
  // 子时特殊处理：23:00-00:59 属于子时
  for (let i = BODY_CLOCK.length - 1; i >= 0; i--) {
    if (hour >= BODY_CLOCK[i].startHour || (i === 0 && hour < 1)) {
      return BODY_CLOCK[i];
    }
  }
  return BODY_CLOCK[0]; // fallback
}

/** 获取下一个关键时辰（亥时或子时） */
export function getNextSleepPeriod(): { period: BodyClockPeriod; minutesUntil: number } {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // 亥时 21:00 或 子时 23:00
  let targetHour = hour < 21 ? 21 : 23;
  if (hour >= 23) targetHour = 21 + 24; // 明天的亥时

  const minutesUntil = (targetHour - hour) * 60 - minute;
  const period = targetHour === 21 || targetHour === 33 ? BODY_CLOCK[11] : BODY_CLOCK[0]; // 亥时 or 子时

  return { period, minutesUntil: Math.max(0, minutesUntil) };
}

/** 格式化时长（分钟 → X小时Y分） */
export function formatSleepDuration(min: number): string {
  if (min <= 0) return '0分钟';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}小时${m}分`;
  if (h > 0) return `${h}小时`;
  return `${m}分钟`;
}

/** 计算睡眠质量等级 */
export function sleepQualityLevel(durationMin: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (durationMin >= 420) return 'excellent';  // ≥7h
  if (durationMin >= 360) return 'good';       // ≥6h
  if (durationMin >= 300) return 'fair';       // ≥5h
  return 'poor';
}

/** 质量等级 emoji */
export function qualityEmoji(level: string): string {
  switch (level) {
    case 'excellent': return '😴';
    case 'good': return '😊';
    case 'fair': return '😐';
    case 'poor': return '😫';
    default: return '😴';
  }
}
