// ─── Shared AI utilities ──────────────────────────────────────────
import { createLogger } from '../logger';

const log = createLogger('AI:utils');

/**
 * Extract JSON from AI response text. Handles:
 * - Markdown code blocks (```json ... ```)
 * - Balanced braces/brackets (finds the last valid JSON object/array)
 * - Falls back to raw text
 */
export function extractJSON(raw: string): string {
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Find the last complete JSON array (thinking text precedes results)
  const lastArray = findLastBalancedJSON(raw, '[', ']');
  if (lastArray) return lastArray;

  const lastObject = findLastBalancedJSON(raw, '{', '}');
  if (lastObject) return lastObject;

  return raw.trim();
}

/**
 * Find the last balanced JSON structure by scanning right-to-left.
 * Handles thinking/reasoning text that may precede the actual JSON.
 */
export function findLastBalancedJSON(text: string, open: string, close: string): string | null {
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === close) {
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let j = i; j >= 0; j--) {
        const ch = text[j];
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === close) depth++;
        if (ch === open) depth--;
        if (depth === 0) {
          const candidate = text.slice(j, i + 1);
          try {
            JSON.parse(candidate);
            return candidate;
          } catch {
            break;
          }
        }
      }
    }
  }
  return null;
}

/**
 * Attempt to repair truncated or malformed JSON from AI responses.
 * Truncates to the last structural closing brace, then auto-closes
 * any remaining open brackets/braces.
 */
export function repairJSON(str: string): string {
  let s = str.trim();
  let lastStructuralClose = -1;
  let depth = 0, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) lastStructuralClose = i; }
  }
  if (lastStructuralClose >= 0) {
    s = s.slice(0, lastStructuralClose + 1);
  }
  // Auto-close missing brackets/braces
  let openBrackets = 0, closeBrackets = 0, openBraces = 0, closeBraces = 0;
  let inString = false, escaped = false;
  for (const ch of s) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '[') openBrackets++;
    else if (ch === ']') closeBrackets++;
    else if (ch === '{') openBraces++;
    else if (ch === '}') closeBraces++;
  }
  for (let i = closeBrackets; i < openBrackets; i++) s += ']';
  for (let i = closeBraces; i < openBraces; i++) s += '}';
  return s;
}
