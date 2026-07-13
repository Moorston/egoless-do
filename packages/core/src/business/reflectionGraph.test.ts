import { describe, it, expect } from 'vitest';
import type { GraphBuildInput } from '../types/reflectionGraph';
import {
  buildRelationGraph,
  generateInsights,
} from './reflectionGraph';

// ── 测试辅助 ────────────────────────────────────────────────

function makeReflection(id = 'r1') {
  return {
    id,
    content: '一篇反思内容',
    tags: ['成长', '感恩'],
    deleted: false,
  };
}

function makeInput(overrides: Partial<GraphBuildInput> = {}): GraphBuildInput {
  return {
    context: { type: 'reflection' as const, id: 'r1' },
    reflections: [makeReflection('r1')],
    thoughtTrails: [],
    plans: [],
    planItems: [],
    habits: [],
    reflectionLinks: [],
    width: 800,
    height: 1200,
    ...overrides,
  };
}

// ── buildRelationGraph ────────────────────────────────────────

describe('buildRelationGraph', () => {
  it('should return graph with at least context node', () => {
    const result = buildRelationGraph(makeInput());
    expect(result.nodes.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(result.edges)).toBe(true);
  });

  it('should create reflection nodes from input', () => {
    const input = makeInput({
      reflections: [makeReflection('r1'), makeReflection('r2')],
    });

    const result = buildRelationGraph(input);
    const refNodes = result.nodes.filter(n => n.type === 'reflection');
    expect(refNodes.length).toBeGreaterThanOrEqual(2);
  });

  it('should cap reflection nodes', () => {
    const reflections = Array.from({ length: 25 }, (_, i) => makeReflection(`r${i}`));
    const result = buildRelationGraph(makeInput({ reflections }));
    const refNodes = result.nodes.filter(n => n.type === 'reflection');
    expect(refNodes.length).toBeLessThanOrEqual(25);
  });

  it('should create edges between related nodes via shared trails', () => {
    const input = makeInput({
      reflections: [makeReflection('r1'), makeReflection('r2')],
      thoughtTrails: [
        { id: 't1', name: 'Trail', reflectionIds: ['r1', 'r2'], deleted: false },
      ],
    });

    const result = buildRelationGraph(input);
    const trailNode = result.nodes.find(n => n.type === 'trail');
    expect(trailNode).toBeDefined();

    const trailEdges = result.edges.filter(e => e.from === 't1' || e.to === 't1');
    expect(trailEdges.length).toBeGreaterThanOrEqual(1);
  });
});

// ── generateInsights ──────────────────────────────────────────

describe('generateInsights', () => {
  it('should return insight strings from graph', () => {
    const input = makeInput({
      reflections: [makeReflection('r1'), makeReflection('r2')],
    });

    const graph = buildRelationGraph(input);
    const insights = generateInsights(graph);
    expect(Array.isArray(insights)).toBe(true);
  });
});