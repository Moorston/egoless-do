import type { UserProfile } from '../types';
import type { StorageAdapter, ProfileSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createProfileSlice(adapter: StorageAdapter): SliceCreator<ProfileSlice> {
  return (set, get) => ({
    userProfile: {},
    waterMl: 0,
    waterGoal: 2000,
    weightUnit: 'kg',

    updateUserProfile(profile: Partial<UserProfile>) {
      const current = get().userProfile;
      const updated = { ...current, ...profile, updatedAt: Date.now() };
      set({ userProfile: updated });
      adapter.persistChange('profile', 'self', updated).catch(console.error);
    },

    addWater(ml: number) {
      if (ml > 0) {
        set(s => ({ waterMl: Math.min((s.waterMl ?? 0) + ml, s.waterGoal ?? 2000) }));
        const s = get();
        adapter.persistChange('profile', 'self', {
          ...s.userProfile, waterMl: s.waterMl, waterGoal: s.waterGoal, updatedAt: Date.now(),
        }).catch(console.error);
      }
    },

    resetWater() {
      set({ waterMl: 0 });
      const s = get();
      adapter.persistChange('profile', 'self', {
        ...s.userProfile, waterMl: 0, waterGoal: s.waterGoal, updatedAt: Date.now(),
      }).catch(console.error);
    },

    setWaterGoal(ml: number) {
      set({ waterGoal: Math.max(100, ml) });
      const s = get();
      adapter.persistChange('profile', 'self', {
        ...s.userProfile, waterMl: s.waterMl, waterGoal: s.waterGoal, updatedAt: Date.now(),
      }).catch(console.error);
    },

    setWeightUnit(u: 'kg' | 'lb') { set({ weightUnit: u }); },
  });
}
