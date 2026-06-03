import { describe, it, expect } from 'vitest';
import { addPlanItem, updatePlanItem } from './plan';
import type { Plan, PlanItem, PlanItemPriority } from '../types';

describe('addPlanItem', () => {
  it('should save priority and targetMetric', () => {
    const items = addPlanItem([], {
      planId: 'p1', name: 'Task 1', description: 'desc',
      startDate: '2026-01-01', endDate: '2026-01-31',
      link: 'fasting', priority: 'high', targetMetric: '16h fasting',
    });

    expect(items).toHaveLength(1);
    expect(items[0].priority).toBe('high');
    expect(items[0].targetMetric).toBe('16h fasting');
    expect(items[0].link).toBe('fasting');
    expect(items[0].name).toBe('Task 1');
    expect(items[0].description).toBe('desc');
  });

  it('should default priority to medium and targetMetric to empty', () => {
    const items = addPlanItem([], {
      planId: 'p1', name: 'Task 2',
      startDate: '2026-01-01', endDate: '2026-01-31',
    });

    expect(items[0].priority).toBe('medium');
    expect(items[0].targetMetric).toBe('');
    expect(items[0].link).toBe('manual');
  });

  it('should preserve all fields when adding multiple items', () => {
    let items = addPlanItem([], {
      planId: 'p1', name: 'Task A', startDate: '2026-01-01', endDate: '2026-01-31',
      priority: 'high', targetMetric: 'target A',
    });
    items = addPlanItem(items, {
      planId: 'p1', name: 'Task B', startDate: '2026-01-01', endDate: '2026-01-31',
      priority: 'low', targetMetric: 'target B', link: 'meditation',
    });

    expect(items).toHaveLength(2);
    expect(items[0].priority).toBe('high');
    expect(items[0].targetMetric).toBe('target A');
    expect(items[1].priority).toBe('low');
    expect(items[1].targetMetric).toBe('target B');
    expect(items[1].link).toBe('meditation');
  });
});

describe('updatePlanItem', () => {
  it('should update priority and targetMetric', () => {
    const items: PlanItem[] = [{
      id: 'item1', planId: 'p1', name: 'Task', description: '',
      startDate: '2026-01-01', endDate: '2026-01-31', contentUrl: '',
      totalCheckinDays: 0, status: 'not_started', progress: 0,
      link: 'manual', priority: 'medium', targetMetric: '',
      order: 0, updatedAt: 0, deleted: false,
    }];

    const updated = updatePlanItem(items, 'item1', {
      priority: 'high', targetMetric: 'new target',
    });

    expect(updated[0].priority).toBe('high');
    expect(updated[0].targetMetric).toBe('new target');
    expect(updated[0].name).toBe('Task'); // other fields preserved
  });

  it('should update link and description', () => {
    const items: PlanItem[] = [{
      id: 'item1', planId: 'p1', name: 'Task', description: 'old',
      startDate: '2026-01-01', endDate: '2026-01-31', contentUrl: '',
      totalCheckinDays: 0, status: 'not_started', progress: 0,
      link: 'manual', priority: 'medium', targetMetric: '',
      order: 0, updatedAt: 0, deleted: false,
    }];

    const updated = updatePlanItem(items, 'item1', {
      link: 'fasting', description: 'new desc', priority: 'low',
    });

    expect(updated[0].link).toBe('fasting');
    expect(updated[0].description).toBe('new desc');
    expect(updated[0].priority).toBe('low');
    expect(updated[0].targetMetric).toBe(''); // unchanged
  });
});
