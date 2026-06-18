// ─── RAG Prompt 构建器 ─────────────────────────────────────────
import type { ReflectionIndex } from './indexer';

const MAX_PROMPT_LENGTH = 800;
const MAX_CONTENT_LENGTH = 60;

/**
 * 将感念格式化为紧凑的摘要格式
 * 格式: [日期] 情绪 内容... [标签]
 */
export function formatReflectionSummary(item: ReflectionIndex): string {
  const date = new Date(item.timestamp).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  });
  const mood = item.mood ? ` ${item.mood}` : '';
  const content = item.content.length > MAX_CONTENT_LENGTH
    ? item.content.slice(0, MAX_CONTENT_LENGTH) + '...'
    : item.content;
  const tags = item.tags.length > 0 ? ` [${item.tags.join(',')}]` : '';
  return `[${date}]${mood} ${content}${tags}`;
}

/**
 * 构建推荐 prompt，将 Top-5 感念格式化为精简 prompt（~500 字符）
 */
export function buildRecommendPrompt(
  query: string,
  reflections: ReflectionIndex[],
): string {
  const reflLines = reflections
    .slice(0, 5)
    .map((r, i) => `[${i}] ${formatReflectionSummary(r)}`)
    .join('\n');
  const queryLine = query ? `主题: "${query}"\n` : '';
  const footer = '只输出JSON: [{"name":"","description":"","reflectionIndices":[0,1],"confidence":0.8}]';

  let prompt = `${queryLine}感念:\n${reflLines}\n${footer}`;

  // 截断到限制长度（保留完整的 footer）
  if (prompt.length > MAX_PROMPT_LENGTH) {
    const footerLen = footer.length + 1;
    prompt = prompt.slice(0, MAX_PROMPT_LENGTH - footerLen) + '\n' + footer;
  }

  return prompt;
}

/**
 * 构建查询意图解析 prompt
 */
export function buildQueryParsePrompt(
  input: string,
  reflections: ReflectionIndex[],
  history?: string[],
): string {
  const header = '分析用户查询意图，返回筛选条件JSON。';
  const inputLine = `查询: "${input}"`;
  const reflLines = reflections
    .slice(0, 5)
    .map((r, i) => `[${i}] ${formatReflectionSummary(r)}`)
    .join('\n');

  const historyPart = history && history.length > 0
    ? `\n对话: ${history.join(' | ')}`
    : '';

  const footer = '输出: {"filters":{"timeRange":"month","tags":[],"moods":[]},"intent":"filter","question":null,"topic":"..."}';

  let prompt = `${header}\n${inputLine}${historyPart}\n感念:\n${reflLines}\n${footer}`;

  if (prompt.length > MAX_PROMPT_LENGTH) {
    const footerLen = footer.length + 1;
    prompt = prompt.slice(0, MAX_PROMPT_LENGTH - footerLen) + '\n' + footer;
  }

  return prompt;
}
