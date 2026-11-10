// ─── Characterization tests for ENTITY_STORE_KEY (single source of truth) ──
// Locks the entity → store slice key mapping byte-for-byte against the
// pre-refactor hand-written record (SyncApplyService.ts). Any transcription
// drift or missing storeKey fails here in the standard test pipeline.

import { describe, it, expect } from 'vitest';

import { ENTITY_STORE_KEY, validateEntityMappings, SYNC_ENTITIES } from './entities';
import { SCHEMAS } from './entitySchemas';

/**
 * Expected storeKey for every entity — transcribed verbatim from the
 * pre-refactor hand-written ENTITY_STORE_KEY in SyncApplyService.ts.
 * `aiConfig` is absent because it is marked `noStore: true`.
 */
const EXPECTED_STORE_KEY: Record<string, string> = {
  habit: 'habits',
  reflection: 'reflections',
  fasting: 'fastingHistory',
  food: 'foodLog',
  checkin: 'checkinHistory',
  exercise: 'exerciseLog',
  meditation: 'medHistory',
  profile: 'userProfile',
  plan: 'plans',
  planItem: 'planItems',
  planItemCheckin: 'planItemCheckins',
  grace: 'graceHistory',
  dailyCustomTodo: 'dailyCustomTodos',
  dailyTodoHistory: 'dailyTodoHistory',
  thoughtTrail: 'thoughtTrails',
  trailNote: 'trailNotes',
  reflectionLink: 'reflectionLinks',
  checkinReview: 'checkinReviews',
  bodyGoal: 'bodyGoals',
  bodyPlan: 'bodyPlans',
  bodyTrainingPlan: 'bodyTrainingPlans',
  weightRecord: 'weightRecords',
  bodyCheckin: 'bodyCheckins',
  sleep: 'sleepHistory',
  give: 'giveHistory',
  motivationEntry: 'motivationLog',
  customWuxing: 'customWuxingMaps',
  vision: 'visions',
  visionPractice: 'visionPractices',
  dedication: 'dedications',
  mantraDef: 'mantraDefs',
  mantraSession: 'mantraSessions',
  sutraReading: 'readingSessions',
  fearEntry: 'fearEntries',
  courageEntry: 'courageEntries',
  fearAchievement: 'achievements',
  breath: 'breathHistory',
  zhiguanSession: 'sessions',
  foodPreset: 'customFoodPresets',
};

describe('ENTITY_STORE_KEY (single source of truth)', () => {
  describe('byte-identical to pre-refactor hand-written values', () => {
    // Drive assertions from the EXPECTED table so any transcription drift is caught.
    for (const [entity, expected] of Object.entries(EXPECTED_STORE_KEY)) {
      it(`${entity} → ${expected}`, () => {
        expect(ENTITY_STORE_KEY[entity]).toBe(expected);
      });
    }
  });

  it('excludes aiConfig (noStore) from the derived mapping', () => {
    expect(ENTITY_STORE_KEY.aiConfig).toBeUndefined();
  });

  it('keys of ENTITY_STORE_KEY ≡ SCHEMAS keys minus noStore entities', () => {
    const noStoreEntities = (Object.keys(SCHEMAS) as string[]).filter(k => SCHEMAS[k as keyof typeof SCHEMAS].noStore);
    const expectedKeys = (Object.keys(SCHEMAS) as string[]).filter(k => !noStoreEntities.includes(k));
    expect(Object.keys(ENTITY_STORE_KEY).sort()).toEqual(expectedKeys.sort());
  });

  it('every non-noStore SCHEMAS entity has an explicit storeKey (no fallback path)', () => {
    for (const k of Object.keys(SCHEMAS) as string[]) {
      const schema = SCHEMAS[k as keyof typeof SCHEMAS];
      if (schema.noStore) continue;
      // storeKey must be set and non-empty — the `${k}s` fallback must never be the resolution
      expect(schema.storeKey, `entity "${k}" is missing explicit storeKey`).toBeTruthy();
      expect(ENTITY_STORE_KEY[k], `derived value for "${k}" must equal storeKey`).toBe(schema.storeKey);
    }
  });

  it('matches the full set of SYNC_ENTITIES', () => {
    // Every SYNC_ENTITIES entry is either in ENTITY_STORE_KEY or marked noStore
    for (const e of SYNC_ENTITIES) {
      const schema = SCHEMAS[e];
      if (schema.noStore) {
        expect(ENTITY_STORE_KEY[e]).toBeUndefined();
      } else {
        expect(ENTITY_STORE_KEY[e]).toBeDefined();
      }
    }
  });

  it('snapshot — full ENTITY_STORE_KEY table (byte-level regression net)', () => {
    expect(ENTITY_STORE_KEY).toMatchSnapshot();
  });
});

describe('validateEntityMappings', () => {
  it('returns no missing entities for the consolidated SCHEMAS', () => {
    const missing = validateEntityMappings();
    expect(missing).toEqual([]);
  });
});
