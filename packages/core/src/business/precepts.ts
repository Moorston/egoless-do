// ─── Precept presets (持戒预设) ─────────────────────────────
// 参考小止观：持戒清净为禅定之基
// 止持：不做恶（消极防非）  作持：行善（积极修善）

export interface PreceptPreset {
  name: string;
  goal: string;
  type: 'avoid' | 'practice';
}

export const PRECEPT_AVOID_PRESETS: PreceptPreset[] = [
  { name: '不发怒', goal: '嗔心起时，先观呼吸三息', type: 'avoid' },
  { name: '不妄语', goal: '言出必真，不背后论人', type: 'avoid' },
  { name: '不贪求', goal: '知足常乐，不攀比嫉妒', type: 'avoid' },
  { name: '不懈怠', goal: '今日事今日毕，不拖延推诿', type: 'avoid' },
  { name: '不沉迷', goal: '屏幕时间有度，不刷无意义内容', type: 'avoid' },
  { name: '不食过量', goal: '饮食七分饱，不贪口腹之欲', type: 'avoid' },
  { name: '不晚睡', goal: '亥时前放下一切，准备入睡', type: 'avoid' },
  { name: '不急躁', goal: '行住坐卧，从容不迫', type: 'avoid' },
];

export const PRACTICE_PRESETS: PreceptPreset[] = [
  { name: '日行一善', goal: '每日至少做一件利他之事', type: 'practice' },
  { name: '随喜赞叹', goal: '见人善行，真心欢喜赞叹', type: 'practice' },
  { name: '感恩日记', goal: '每日记录三件值得感恩的事', type: 'practice' },
  { name: '每日静坐', goal: '至少 10 分钟正念静坐', type: 'practice' },
  { name: '正念饮食', goal: '一餐饭，专注在食物上', type: 'practice' },
  { name: '经行散步', goal: '行走时觉知脚步', type: 'practice' },
];

export const VIOLATION_TRIGGERS = [
  '工作压力', '人际关系', '身体疲惫', '贪欲', '情绪波动', '环境诱惑',
];

export const PRECEPT_PREFIX_AVOID = '「戒」';
export const PRECEPT_PREFIX_PRACTICE = '「善」';

/** 检查习惯名称是否为持戒条目 */
export function isPreceptHabit(name: string): boolean {
  return name.startsWith(PRECEPT_PREFIX_AVOID) || name.startsWith(PRECEPT_PREFIX_PRACTICE);
}

/** 获取持戒条目的显示名称（去掉前缀） */
export function getPreceptDisplayName(name: string): string {
  return name.replace(PRECEPT_PREFIX_AVOID, '').replace(PRECEPT_PREFIX_PRACTICE, '');
}

/** 获取持戒条目类型 */
export function getPreceptType(name: string): 'avoid' | 'practice' | null {
  if (name.startsWith(PRECEPT_PREFIX_AVOID)) return 'avoid';
  if (name.startsWith(PRECEPT_PREFIX_PRACTICE)) return 'practice';
  return null;
}
