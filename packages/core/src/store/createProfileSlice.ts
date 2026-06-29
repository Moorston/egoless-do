import type { UserProfile } from '../types';
import type { StorageAdapter, ProfileSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

export function createProfileSlice(adapter: StorageAdapter): SliceCreator<ProfileSlice> {
  return (set, get) => ({
    userProfile: {},
    waterMl: 0,
    waterGoal: 2000,
    weightUnit: 'kg',

    updateUserProfile(profile: Partial<UserProfile>) {
      const current = get().userProfile;
      const updated = { ...current, ...profile, updatedAt: Date.now() };
      const patch: Record<string, unknown> = { userProfile: updated };
      // Sync weightUnit to top-level field if changed
      if (profile.weightUnit !== undefined) patch.weightUnit = profile.weightUnit;
      set(patch);
      adapter.persistChange('profile', 'self', updated).catch(e => log.error(e));
    },

    addWater(ml: number) {
      if (ml > 0) {
        const now = Date.now();
        let persistData: Record<string, unknown> | undefined;
        set(s => {
          const waterMl = (s.waterMl ?? 0) + ml;
          const updated = { ...s.userProfile, waterMl, updatedAt: now };
          persistData = { ...updated, waterGoal: s.waterGoal };
          return { waterMl, userProfile: updated };
        });
        if (persistData) adapter.persistChange('profile', 'self', persistData).catch(e => log.error(e));
      }
    },

    resetWater() {
      const now = Date.now();
      let persistData: Record<string, unknown> | undefined;
      set(s => {
        persistData = { ...s.userProfile, waterMl: 0, waterGoal: s.waterGoal, updatedAt: now };
        return { waterMl: 0, userProfile: { ...s.userProfile, waterMl: 0, updatedAt: now } };
      });
      if (persistData) adapter.persistChange('profile', 'self', persistData).catch(e => log.error(e));
    },

    setWaterGoal(ml: number) {
      const now = Date.now();
      let persistData: Record<string, unknown> | undefined;
      set(s => {
        const waterGoal = Math.max(100, ml);
        persistData = { ...s.userProfile, waterMl: s.waterMl, waterGoal, updatedAt: now };
        return { waterGoal, userProfile: { ...s.userProfile, waterGoal, updatedAt: now } };
      });
      if (persistData) adapter.persistChange('profile', 'self', persistData).catch(e => log.error(e));
    },

    setWeightUnit(u: 'kg' | 'lb') {
      const now = Date.now();
      let persistData: Record<string, unknown> | undefined;
      set(s => {
        persistData = { ...s.userProfile, waterMl: s.waterMl, waterGoal: s.waterGoal, weightUnit: u, updatedAt: now };
        return { weightUnit: u, userProfile: { ...s.userProfile, weightUnit: u, updatedAt: now } };
      });
      if (persistData) adapter.persistChange('profile', 'self', persistData).catch(e => log.error(e));
    },
  });
}
