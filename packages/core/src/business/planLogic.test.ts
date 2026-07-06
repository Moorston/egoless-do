// ─── Plan business logic tests ─────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  getActivePlan, addPlan, canDeletePlan, canEditPlan,
  isPlanActive, isPlanDelayed, startPlan, computePlanProgress,
  statusToI18nKey,
} from './plan';
import type { Plan, PlanItem, PlanItemCheckin } from '../types';

const mkPlan = (overrides: Partial<Plan> = {}): Plan => ({
  id: 'p1', name: 'Test', status: 'draft', deleted: false,
  startDate: '2026-01-01', endDate: '2026-01-31', updatedAt: 0,
  goal: '', progress: 0, ...overrides,
});

describe('plan business logic', () => {
  describe('getActivePlan', () => {
    it('returns in_progress plan', () => {
      const plans = [mkPlan({ id: 'p1', status: 'draft' }), mkPlan({ id: 'p2', status: 'in_progress' })];
      expect(getActivePlan(plans)?.id).toBe('p2');
    });

    it('prefers in_progress over paused', () => {
      const plans = [mkPlan({ id: 'p1', status: 'paused' }), mkPlan({ id: 'p2', status: 'in_progress' })];
      expect(getActivePlan(plans)?.id).toBe('p2');
    });

    it('returns null if no active plan', () => {
      const plans = [mkPlan({ status: 'draft' }), mkPlan({ id: 'p2', status: 'completed' })];
      expect(getActivePlan(plans)).toBeNull();
    });

    it('ignores deleted plans', () => {
      const plans = [mkPlan({ status: 'in_progress', deleted: true })];
      expect(getActivePlan(plans)).toBeNull();
    });
  });

  describe('addPlan', () => {
    it('creates a plan with in_progress status when start date is today or past', () => {
      const result = addPlan([], { name: 'Test', goal: 'Learn', startDate: '2026-01-01', endDate: '2026-01-31' }, '2026-01-15');
      expect(result).toBeTruthy();
      expect(result!.plans[0].status).toBe('in_progress');
    });

    it('creates a plan with not_started status when start date is future', () => {
      const result = addPlan([], { name: 'Test', goal: 'Learn', startDate: '2026-03-01', endDate: '2026-03-31' }, '2026-01-15');
      expect(result).toBeTruthy();
      expect(result!.plans[0].status).toBe('not_started');
    });

    it('returns null if active plan exists and new plan would be active', () => {
      const plans = [mkPlan({ id: 'p1', status: 'in_progress' })];
      const result = addPlan(plans, { name: 'New', goal: 'Goal', startDate: '2026-01-01', endDate: '2026-01-31' }, '2026-01-15');
      expect(result).toBeNull();
    });
  });

  describe('canDeletePlan', () => {
    it('allows deleting not_started plan', () => expect(canDeletePlan('not_started')).toBe(true));
    it('allows deleting cancelled plan', () => expect(canDeletePlan('cancelled')).toBe(true));
    it('does not allow deleting in_progress plan', () => expect(canDeletePlan('in_progress')).toBe(false));
    it('does not allow deleting completed plan', () => expect(canDeletePlan('completed')).toBe(false));
  });

  describe('isPlanActive', () => {
    it('returns true for not_started, in_progress, paused', () => {
      expect(isPlanActive('not_started')).toBe(true);
      expect(isPlanActive('in_progress')).toBe(true);
      expect(isPlanActive('paused')).toBe(true);
    });

    it('returns false for draft, completed, cancelled', () => {
      expect(isPlanActive('draft')).toBe(false);
      expect(isPlanActive('completed')).toBe(false);
      expect(isPlanActive('cancelled')).toBe(false);
    });
  });

  describe('isPlanDelayed', () => {
    it('returns true when past end date and not completed/cancelled', () => {
      expect(isPlanDelayed(mkPlan({ status: 'in_progress', endDate: '2026-01-15' }), '2026-01-20')).toBe(true);
    });

    it('returns false when within date range', () => {
      expect(isPlanDelayed(mkPlan({ status: 'in_progress', endDate: '2026-01-31' }), '2026-01-15')).toBe(false);
    });

    it('returns false for completed plan', () => {
      expect(isPlanDelayed(mkPlan({ status: 'completed', endDate: '2026-01-15' }), '2026-01-20')).toBe(false);
    });
  });

  describe('statusToI18nKey', () => {
    it('converts camelCase statuses', () => {
      expect(statusToI18nKey('draft')).toBe('planStatusDraft');
      expect(statusToI18nKey('not_started')).toBe('planStatusNotStarted');
      expect(statusToI18nKey('in_progress')).toBe('planStatusInProgress');
    });
  });
});
