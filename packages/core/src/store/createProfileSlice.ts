import type { UserProfile } from '../types';
import type { StorageAdapter, ProfileSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createProfileSlice(adapter: StorageAdapter): SliceCreator<ProfileSlice> {
  return (set: any, get: any) => ({
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
      adapter.persistChange('profile', 'self', updated).catch(console.error);
    },

    addWater(ml: number) {
      if (ml > 0) {
        set(s => {
          const waterMl = Math.min((s.waterMl ?? 0) + ml, s.waterGoal ?? 2000);
          return { waterMl, userProfile: { ...s.userProfile, waterMl, updatedAt: Date.now() } };
        });
        const s = get();
        adapter.persistChange('profile', 'self', {
          ...s.userProfile, waterMl: s.waterMl, waterGoal: s.waterGoal, updatedAt: Date.now(),
        }).catch(console.error);
      }
    },

    resetWater() {
      set(s => ({ waterMl: 0, userProfile: { ...s.userProfile, waterMl: 0, updatedAt: Date.now() } }));
      const s = get();
      adapter.persistChange('profile', 'self', {
        ...s.userProfile, waterMl: 0, waterGoal: s.waterGoal, updatedAt: Date.now(),
      }).catch(console.error);
    },

    setWaterGoal(ml: number) {
      set(s => {
        const waterGoal = Math.max(100, ml);
        return { waterGoal, userProfile: { ...s.userProfile, waterGoal, updatedAt: Date.now() } };
      });
      const s = get();
      adapter.persistChange('profile', 'self', {
        ...s.userProfile, waterMl: s.waterMl, waterGoal: s.waterGoal, updatedAt: Date.now(),
      }).catch(console.error);
    },

    setWeightUnit(u: 'kg' | 'lb') {
      set(s => ({ weightUnit: u, userProfile: { ...s.userProfile, weightUnit: u, updatedAt: Date.now() } }));
      const s = get();
      adapter.persistChange('profile', 'self', {
        ...s.userProfile, waterMl: s.waterMl, waterGoal: s.waterGoal, weightUnit: u, updatedAt: Date.now(),
      }).catch(console.error);
    },
  });
}
