// ─── 本地检索与多维评分（支持语义同义词扩展）─────────────────────
import type { ReflectionIndex } from './indexer';

export interface ScoredReflection {
  index: ReflectionIndex;
  score: number;
}

// 评分权重
const WEIGHTS = {
  keyword: 0.35,
  synonym: 0.25,
  mood: 0.2,
  time: 0.1,
  tag: 0.1,
};

// 时间衰减：30天半衰期
const TIME_DECAY_HALF_LIFE = 30 * 86400000;

// ─── 语义同义词表 ──────────────────────────────────────────────
export const SYNONYM_MAP: Record<string, string[]> = {
  // 情绪类
  '焦虑': ['紧张', '不安', '担心', '忧虑', '压力', '压力大', '睡不着', '失眠', '烦躁', '恐慌'],
  '开心': ['高兴', '快乐', '愉快', '喜悦', '满足', '幸福', '不错', '很好', '挺好', '棒'],
  '平静': ['安宁', '放松', '淡定', '从容', '安心', '踏实', '舒服'],
  '沮丧': ['失落', '难过', '悲伤', '低落', '郁闷', '烦', '不开心', '不高兴', '消沉'],
  '愤怒': ['生气', '恼火', '烦躁', '气愤', '不满', '火大', '暴躁'],
  '疲惫': ['累', '疲倦', '疲劳', '困', '没精神', '没力气', '精力不足', '倦怠'],
  '孤独': ['寂寞', '孤单', '一个人', '没人', '无聊', '空虚'],
  '迷茫': ['困惑', '不知道', '不确定', '纠结', '犹豫', '徘徊'],
  '感恩': ['感谢', '感激', '珍惜', '知足', '幸运'],
  '成长': ['进步', '提升', '学习', '领悟', '明白', '懂了', '学会'],
  // 主题类
  '工作': ['上班', '加班', '项目', 'deadline', '会议', '开会', '老板', '同事', '职场', '公司'],
  '学习': ['读书', '看书', '课程', '考试', '复习', '知识', '技能', '培训'],
  '感情': ['恋爱', '爱情', '对象', '男朋友', '女朋友', '伴侣', '婚姻', '分手'],
  '家庭': ['父母', '家人', '爸妈', '家里', '回家', '亲人'],
  '健康': ['运动', '锻炼', '跑步', '身体', '生病', '医院', '吃药', '睡眠'],
  '金钱': ['钱', '工资', '收入', '消费', '存钱', '理财', '投资', '花销'],
  '未来': ['计划', '目标', '梦想', '规划', '方向', '前途'],
  '压力': ['压力大', '焦虑', '紧张', '负担', '承受', '喘不过气'],
};

// 构建反向索引：同义词 → 主词
const REVERSE_SYNONYM: Record<string, string> = {};
for (const [main, synonyms] of Object.entries(SYNONYM_MAP)) {
  for (const syn of synonyms) {
    REVERSE_SYNONYM[syn] = main;
  }
}

/**
 * 扩展查询词：将查询中的词替换/扩展为包含同义词
 */
export function expandTerms(terms: string[]): string[] {
  const expanded = new Set<string>(terms);
  for (const term of terms) {
    // 如果是某个主词的同义词，加入主词和所有同义词
    const main = REVERSE_SYNONYM[term];
    if (main) {
      expanded.add(main);
      for (const syn of SYNONYM_MAP[main]) expanded.add(syn);
    }
    // 如果是主词，加入所有同义词
    if (SYNONYM_MAP[term]) {
      for (const syn of SYNONYM_MAP[term]) expanded.add(syn);
    }
    // 部分匹配：检查是否是某个同义词表中词的子串（要求至少2字符避免误匹配）
    if (term.length >= 2) {
      for (const [main, synonyms] of Object.entries(SYNONYM_MAP)) {
        if (term.includes(main) || main.includes(term)) {
          expanded.add(main);
          for (const syn of synonyms) expanded.add(syn);
        }
        for (const syn of synonyms) {
          if (term.includes(syn) || syn.includes(term)) {
            expanded.add(main);
            for (const s of synonyms) expanded.add(s);
          }
        }
      }
    }
  }
  return Array.from(expanded);
}

/**
 * 多维评分检索，返回 Top-K 相关感念
 */
export function retrieveTopK(
  query: string,
  index: ReflectionIndex[],
  k: number = 5,
): ScoredReflection[] {
  if (!query.trim() || index.length === 0) return [];

  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (queryTerms.length === 0) return [];

  // 扩展查询词（加入同义词）
  const expandedTerms = expandTerms(queryTerms);

  const now = Date.now();

  const scored: ScoredReflection[] = index.map(item => {
    const keywordScore = calcKeywordScore(queryTerms, item);
    const synonymScore = calcSynonymScore(expandedTerms, item);
    const moodScore = calcMoodScore(queryTerms, item);
    const timeScore = calcTimeScore(item.timestamp, now);
    const tagScore = calcTagScore(queryTerms, item);

    const total =
      keywordScore * WEIGHTS.keyword +
      synonymScore * WEIGHTS.synonym +
      moodScore * WEIGHTS.mood +
      timeScore * WEIGHTS.time +
      tagScore * WEIGHTS.tag;

    return { index: item, score: total };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/**
 * 原始关键词匹配评分（0-1）
 */
function calcKeywordScore(terms: string[], item: ReflectionIndex): number {
  let matchCount = 0;
  for (const term of terms) {
    if (
      item.contentLower.includes(term) ||
      item.tagsLower.some(t => t.includes(term)) ||
      item.moodLower.includes(term)
    ) {
      matchCount++;
    }
  }
  return terms.length > 0 ? matchCount / terms.length : 0;
}

/**
 * 同义词扩展匹配评分（0-1）
 */
function calcSynonymScore(expandedTerms: string[], item: ReflectionIndex): number {
  let matchCount = 0;
  for (const term of expandedTerms) {
    if (
      item.contentLower.includes(term) ||
      item.tagsLower.some(t => t.includes(term)) ||
      item.moodLower.includes(term)
    ) {
      matchCount++;
    }
  }
  // 归一化：扩展词数量可能很多，用原始词数量归一化
  return Math.min(1, matchCount / Math.max(3, Math.min(expandedTerms.length, 10) / 3));
}

/**
 * 情绪匹配评分（0-1）
 */
function calcMoodScore(terms: string[], item: ReflectionIndex): number {
  if (!item.mood) return 0;
  for (const term of terms) {
    if (item.moodLower.includes(term)) return 1;
    // 通过同义词表匹配
    const main = REVERSE_SYNONYM[term];
    if (main && (item.moodLower.includes(main) || SYNONYM_MAP[main]?.some(s => item.moodLower.includes(s)))) {
      return 0.8;
    }
  }
  return 0;
}

/**
 * 时间衰减评分（0-1），越近越高
 */
function calcTimeScore(timestamp: number, now: number): number {
  const age = now - timestamp;
  if (age <= 0) return 1;
  return Math.exp(-age / TIME_DECAY_HALF_LIFE);
}

/**
 * 标签匹配评分（0-1）
 */
function calcTagScore(terms: string[], item: ReflectionIndex): number {
  if (item.tags.length === 0) return 0;
  let matchCount = 0;
  for (const term of terms) {
    if (item.tagsLower.some(t => t.includes(term) || term.includes(t))) {
      matchCount++;
    }
  }
  return Math.min(1, matchCount / Math.max(1, terms.length));
}
