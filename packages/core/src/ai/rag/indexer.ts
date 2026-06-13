// ─── 感念索引构建 ──────────────────────────────────────────────
import type { MindReflection } from '../../types/reflection';

export interface ReflectionIndex {
  id: string;
  content: string;
  contentLower: string;
  keywords: string[];
  mood: string;
  moodLower: string;
  tags: string[];
  tagsLower: string[];
  timestamp: number;
}

/**
 * 从感念数组构建检索索引，提取关键词、情绪、标签等特征
 */
export function buildIndex(reflections: MindReflection[]): ReflectionIndex[] {
  return reflections
    .filter(r => !r.deleted)
    .map(r => ({
      id: r.id,
      content: r.content,
      contentLower: r.content.toLowerCase(),
      keywords: extractKeywords(r.content),
      mood: r.mood ?? '',
      moodLower: (r.mood ?? '').toLowerCase(),
      tags: r.tags,
      tagsLower: r.tags.map(t => t.toLowerCase()),
      timestamp: r.timestamp,
    }));
}

/**
 * 从文本中提取关键词（简单分词）
 */
function extractKeywords(text: string): string[] {
  // 移除标点符号，按空格和常见分隔符分词
  const cleaned = text.replace(/[，。！？、；：""''（）【】《》\s]+/g, ' ');
  const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
  // 去重并转小写
  return [...new Set(words.map(w => w.toLowerCase()))];
}
