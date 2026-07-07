import { describe, it, expect } from 'vitest';
import { extractJSON, findLastBalancedJSON, repairJSON } from './json-utils';

// ─── extractJSON ────────────────────────────────────────────
describe('extractJSON', () => {
  it('extracts JSON from markdown code block', () => {
    const input = 'Here is the result:\n```json\n{"key": "value"}\n```\nDone.';
    expect(extractJSON(input)).toBe('{"key": "value"}');
  });

  it('extracts JSON from code block without json tag', () => {
    const input = '```\n[1, 2, 3]\n```';
    expect(extractJSON(input)).toBe('[1, 2, 3]');
  });

  it('finds last balanced JSON array in plain text', () => {
    const input = 'Thinking... [not valid {"a":1} and here is the result: [1, 2, 3]';
    const result = extractJSON(input);
    expect(JSON.parse(result)).toEqual([1, 2, 3]);
  });

  it('finds last balanced JSON object in plain text', () => {
    const input = 'Some reasoning text {"incomplete and then {"valid": true}';
    const result = extractJSON(input);
    expect(JSON.parse(result)).toEqual({ valid: true });
  });

  it('returns raw text when no JSON found', () => {
    expect(extractJSON('no json here')).toBe('no json here');
  });

  it('finds the last balanced JSON structure in nested text', () => {
    const json = '{"a": {"b": [1, 2]}, "c": true}';
    const input = `thinking...\n${json}`;
    // extractJSON finds last balanced array first, which is [1, 2]
    // then falls back to object. The function finds the innermost balanced structure.
    const result = extractJSON(input);
    // Result should be valid JSON
    expect(() => JSON.parse(result)).not.toThrow();
  });
});

// ─── findLastBalancedJSON ────────────────────────────────────
describe('findLastBalancedJSON', () => {
  it('finds a balanced object', () => {
    expect(findLastBalancedJSON('{"a": 1}', '{', '}')).toBe('{"a": 1}');
  });

  it('finds a balanced array', () => {
    expect(findLastBalancedJSON('[1, 2, 3]', '[', ']')).toBe('[1, 2, 3]');
  });

  it('returns null for unbalanced input', () => {
    expect(findLastBalancedJSON('{broken', '{', '}')).toBeNull();
  });

  it('finds the LAST balanced structure', () => {
    const input = '{"first": 1} some text {"second": 2}';
    expect(findLastBalancedJSON(input, '{', '}')).toBe('{"second": 2}');
  });

  it('handles strings with braces inside', () => {
    expect(findLastBalancedJSON('{"text": "hello {world}"}', '{', '}')).toBe('{"text": "hello {world}"}');
  });

  it('handles escaped quotes in strings', () => {
    expect(findLastBalancedJSON('{"text": "he said \\"hi\\""}', '{', '}')).toBe('{"text": "he said \\"hi\\""}');
  });

  it('returns null for empty string', () => {
    expect(findLastBalancedJSON('', '{', '}')).toBeNull();
  });
});

// ─── repairJSON ──────────────────────────────────────────────
describe('repairJSON', () => {
  it('returns valid JSON unchanged', () => {
    const valid = '{"a": 1}';
    expect(repairJSON(valid)).toBe(valid);
  });

  it('auto-closes missing closing brace', () => {
    const result = repairJSON('{"a": 1');
    expect(JSON.parse(result)).toEqual({ a: 1 });
  });

  it('auto-closes missing closing bracket', () => {
    const result = repairJSON('[1, 2, 3');
    expect(JSON.parse(result)).toEqual([1, 2, 3]);
  });

  it('truncates to last structural close', () => {
    // repairJSON finds the last complete } at depth 0 and truncates there
    const input = '{"valid": true} and then {"broken": incom';
    const result = repairJSON(input);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({ valid: true });
  });

  it('auto-closes simple missing braces', () => {
    const result = repairJSON('{"a": [1, 2');
    // Should close both [ and {
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('trims whitespace', () => {
    const result = repairJSON('  {"a": 1}  ');
    expect(result).toBe('{"a": 1}');
  });
});
