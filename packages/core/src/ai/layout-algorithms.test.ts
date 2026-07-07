import { describe, it, expect } from 'vitest';
import { applyForceLayout } from './layout-algorithms';
import type { LayoutNode, LayoutEdge } from './layout-algorithms';

describe('applyForceLayout', () => {
  it('modifies node positions', () => {
    const nodes: LayoutNode[] = [
      { id: 'a', x: 0, y: 0, vx: 0, vy: 0, size: 10 },
      { id: 'b', x: 100, y: 0, vx: 0, vy: 0, size: 10 },
    ];
    const edges: LayoutEdge[] = [{ from: 'a', to: 'b' }];

    const beforeA = { x: nodes[0].x, y: nodes[0].y };
    applyForceLayout(nodes, edges, 800, 600);

    // At least one node should have moved
    const moved = nodes[0].x !== beforeA.x || nodes[0].y !== beforeA.y ||
                  nodes[1].x !== 100 || nodes[1].y !== 0;
    expect(moved).toBe(true);
  });

  it('handles empty nodes gracefully', () => {
    expect(() => applyForceLayout([], [], 800, 600)).not.toThrow();
  });

  it('handles single node', () => {
    const nodes: LayoutNode[] = [
      { id: 'a', x: 400, y: 300, vx: 0, vy: 0, size: 10 },
    ];
    applyForceLayout(nodes, [], 800, 600);
    // Single node should be pulled toward center
    expect(nodes[0].x).toBeDefined();
    expect(nodes[0].y).toBeDefined();
  });

  it('accepts custom config without error', () => {
    const nodes: LayoutNode[] = [
      { id: 'a', x: 0, y: 0, vx: 0, vy: 0, size: 10 },
      { id: 'b', x: 50, y: 0, vx: 0, vy: 0, size: 10 },
    ];
    const edges: LayoutEdge[] = [{ from: 'a', to: 'b' }];

    expect(() => {
      applyForceLayout(nodes, edges, 800, 600, {
        repulsionForce: 100,
        attractionForce: 0.01,
        centerGravity: 0.005,
        damping: 0.9,
        maxIterations: 10,
      });
    }).not.toThrow();
  });
});
