// ─── Thought Pattern Detection ──────────────────────────────────
import type { MindReflection } from '../types';
import { dateStr } from '../utils';

export interface ThoughtPattern {
  id: string;
  type: 'cycle' | 'trigger' | 'growth' | 'stuck';
  name: string;
  description: string;
  reflections: string[]; // reflection ids
  frequency: number;
  confidence: number;
  createdAt: number;
}

// 情绪序列模式
const MOOD_SEQUENCES = {
  anxiety_cycle: {
    moods: ['焦虑', '焦虑', '难过', '焦虑'],
    name: '焦虑循环',
    description: '反复陷入焦虑，难以跳出',
    type: 'cycle' as const,
  },
  stress_escape: {
    moods: ['焦虑', '疲惫', '平静', '焦虑'],
    name: '压力逃避循环',
    description: '压力→疲惫→短暂平静→再次压力',
    type: 'cycle' as const,
  },
  growth_path: {
    moods: ['焦虑', '平静', '开心'],
    name: '成长路径',
    description: '从焦虑走向平静和快乐',
    type: 'growth' as const,
  },
  mood_swing: {
    moods: ['开心', '难过', '开心', '难过'],
    name: '情绪波动',
    description: '情绪起伏较大，不稳定',
    type: 'stuck' as const,
  },
};

// 检测情绪序列模式
export function detectMoodSequencePatterns(reflections: MindReflection[]): ThoughtPattern[] {
  const patterns: ThoughtPattern[] = [];
  const sortedReflections = reflections
    .filter(r => !r.deleted)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (sortedReflections.length < 4) return patterns;

  // 提取情绪序列
  const moodSequence = sortedReflections.map(r => r.mood);

  // 滑动窗口检测
  for (const [key, pattern] of Object.entries(MOOD_SEQUENCES)) {
    const seqLen = pattern.moods.length;
    let matchCount = 0;
    const matchedReflections: string[] = [];

    for (let i = 0; i <= moodSequence.length - seqLen; i++) {
      const window = moodSequence.slice(i, i + seqLen);
      const isMatch = window.every((mood, idx) => {
        if (pattern.moods[idx] === '*') return true;
        return mood === pattern.moods[idx];
      });

      if (isMatch) {
        matchCount++;
        matchedReflections.push(...sortedReflections.slice(i, i + seqLen).map(r => r.id));
      }
    }

    if (matchCount >= 2) {
      patterns.push({
        id: `mood_seq_${key}`,
        type: pattern.type,
        name: pattern.name,
        description: pattern.description,
        reflections: [...new Set(matchedReflections)],
        frequency: matchCount,
        confidence: Math.min(0.9, matchCount * 0.3),
        createdAt: Date.now(),
      });
    }
  }

  return patterns;
}

// 检测标签模式
export function detectTagPatterns(reflections: MindReflection[]): ThoughtPattern[] {
  const patterns: ThoughtPattern[] = [];
  const sortedReflections = reflections.filter(r => !r.deleted);

  // 按标签分组
  const tagGroups = new Map<string, MindReflection[]>();
  sortedReflections.forEach(r => {
    r.tags.forEach(tag => {
      const group = tagGroups.get(tag) ?? [];
      group.push(r);
      tagGroups.set(tag, group);
    });
  });

  // 检测高频标签
  tagGroups.forEach((group, tag) => {
    if (group.length >= 5) {
      // 检测是否有情绪变化
      const moods = group.map(r => r.mood);
      const uniqueMoods = new Set(moods);
      
      if (uniqueMoods.size >= 3) {
        patterns.push({
          id: `tag_pattern_${tag}`,
          type: 'trigger',
          name: `「${tag}」触发多种情绪`,
          description: `与${tag}相关的感念包含${uniqueMoods.size}种不同情绪`,
          reflections: group.map(r => r.id),
          frequency: group.length,
          confidence: 0.7,
          createdAt: Date.now(),
        });
      }
    }
  });

  return patterns;
}

// 检测时间模式
export function detectTimePatterns(reflections: MindReflection[]): ThoughtPattern[] {
  const patterns: ThoughtPattern[] = [];
  const sortedReflections = reflections.filter(r => !r.deleted);

  // 按小时分组
  const hourGroups = new Map<number, MindReflection[]>();
  sortedReflections.forEach(r => {
    const hour = new Date(r.timestamp).getHours();
    const group = hourGroups.get(hour) ?? [];
    group.push(r);
    hourGroups.set(hour, group);
  });

  // 检测特定时段的高发情绪
  hourGroups.forEach((group, hour) => {
    if (group.length >= 3) {
      const moodCounts = new Map<string, number>();
      group.forEach(r => {
        moodCounts.set(r.mood, (moodCounts.get(r.mood) ?? 0) + 1);
      });

      const dominantMood = [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      
      if (dominantMood && dominantMood[1] >= 3) {
        const timeLabel = hour < 6 ? '凌晨' : hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上';
        patterns.push({
          id: `time_pattern_${hour}`,
          type: 'trigger',
          name: `${timeLabel}容易${dominantMood[0]}`,
          description: `${timeLabel}记录的感念多为${dominantMood[0]}情绪`,
          reflections: group.map(r => r.id),
          frequency: dominantMood[1],
          confidence: 0.6,
          createdAt: Date.now(),
        });
      }
    }
  });

  return patterns;
}

// 检测关键词模式
export function detectKeywordPatterns(reflections: MindReflection[]): ThoughtPattern[] {
  const patterns: ThoughtPattern[] = [];
  const sortedReflections = reflections.filter(r => !r.deleted);

  // 常见关键词
  const keywords = [
    { word: '工作', category: '压力源' },
    { word: '焦虑', category: '情绪' },
    { word: '累', category: '状态' },
    { word: '睡', category: '生活' },
    { word: '朋友', category: '社交' },
    { word: '家人', category: '家庭' },
    { word: '学习', category: '成长' },
    { word: '钱', category: '财务' },
  ];

  keywords.forEach(({ word, category }) => {
    const matchedReflections = sortedReflections.filter(r => r.content.includes(word));
    
    if (matchedReflections.length >= 3) {
      // 分析关联情绪
      const moodCounts = new Map<string, number>();
      matchedReflections.forEach(r => {
        moodCounts.set(r.mood, (moodCounts.get(r.mood) ?? 0) + 1);
      });

      const sortedMoods = [...moodCounts.entries()].sort((a, b) => b[1] - a[1]);
      const dominantMoodLabel = sortedMoods.length > 0 ? sortedMoods[0][0] : '未知';

      patterns.push({
        id: `keyword_${word}`,
        type: 'trigger',
        name: `「${word}」频繁出现`,
        description: `与${category}相关的「${word}」出现${matchedReflections.length}次，多伴随${dominantMoodLabel}情绪`,
        reflections: matchedReflections.map(r => r.id),
        frequency: matchedReflections.length,
        confidence: 0.65,
        createdAt: Date.now(),
      });
    }
  });

  return patterns;
}

// 检测成长模式
export function detectGrowthPatterns(reflections: MindReflection[]): ThoughtPattern[] {
  const patterns: ThoughtPattern[] = [];
  
  // 按周分组
  const weeklyGroups = new Map<string, MindReflection[]>();
  reflections.filter(r => !r.deleted).forEach(r => {
    const weekStart = new Date(r.timestamp);
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (day + 6) % 7); // Monday as week start
    const weekKey = dateStr(weekStart);
    const group = weeklyGroups.get(weekKey) ?? [];
    group.push(r);
    weeklyGroups.set(weekKey, group);
  });

  // 情绪评分
  const moodScores: Record<string, number> = {
    '开心': 5, '兴奋': 5, '感恩': 4,
    '平静': 3,
    '焦虑': 2, '疲惫': 2,
    '难过': 1, '生气': 1,
  };

  // 计算每周平均情绪
  const weeklyScores: { week: string; score: number }[] = [];
  weeklyGroups.forEach((group, week) => {
    const scores = group.map(r => moodScores[r.mood] ?? 3);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    weeklyScores.push({ week, score: avg });
  });

  // 检测持续成长
  if (weeklyScores.length >= 3) {
    const sorted = weeklyScores.sort((a, b) => a.week.localeCompare(b.week));
    const isGrowing = sorted.slice(-3).every((item, i, arr) => 
      i === 0 || item.score > arr[i - 1].score
    );

    if (isGrowing) {
      patterns.push({
        id: 'growth_trend',
        type: 'growth',
        name: '持续成长趋势',
        description: '最近3周情绪状态持续改善',
        reflections: [],
        frequency: 3,
        confidence: 0.7,
        createdAt: Date.now(),
      });
    }
  }

  return patterns;
}

// 获取所有思维模式
export function getAllThoughtPatterns(reflections: MindReflection[]): ThoughtPattern[] {
  const patterns: ThoughtPattern[] = [
    ...detectMoodSequencePatterns(reflections),
    ...detectTagPatterns(reflections),
    ...detectTimePatterns(reflections),
    ...detectKeywordPatterns(reflections),
    ...detectGrowthPatterns(reflections),
  ];

  // 按置信度排序
  return patterns.sort((a, b) => b.confidence - a.confidence);
}
