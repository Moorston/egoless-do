// ─── Health Service — Apple HealthKit / Health Connect abstraction ──
import { Platform, Alert } from 'react-native';
import type { ExerciseEntry } from '@egoless-do/core';
import { dateStr } from '@egoless-do/core';

// ── Sport key → HealthKit / Health Connect workout type mapping ──
const SPORT_TO_HK_WORKOUT: Record<string, string> = {
  '户外骑行': 'cycling',
  '室内跑步': 'running',
  '爬楼梯': 'stairClimbing',
  '跳绳': 'jumpRope',
  '羽毛球': 'badminton',
  '足球': 'soccer',
  '篮球': 'basketball',
  '乒乓球': 'tableTennis',
  '网球': 'tennis',
  '瑜伽': 'yoga',
  '游泳': 'swimming',
};

const SPORT_TO_HC_EXERCISE: Record<string, string> = {
  '户外骑行': 'Biking',
  '室内跑步': 'Running',
  '爬楼梯': 'StairClimbing',
  '跳绳': 'JumpRope',
  '羽毛球': 'Badminton',
  '足球': 'Football',
  '篮球': 'Basketball',
  '乒乓球': 'TableTennis',
  '网球': 'Tennis',
  '瑜伽': 'Yoga',
  '游泳': 'Swimming',
};

let healthKit: any = null;
let healthConnect: any = null;

function getHealthKit() {
  if (!healthKit) {
    try {
      healthKit = require('react-native-health').default;
    } catch {
      return null;
    }
  }
  return healthKit;
}

function getHealthConnect() {
  if (!healthConnect) {
    try {
      healthConnect = require('react-native-health-connect');
    } catch {
      return null;
    }
  }
  return healthConnect;
}

export function isHealthAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'ios') return !!getHealthKit();
  if (Platform.OS === 'android') return !!getHealthConnect();
  return false;
}

export async function requestHealthPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const HK = getHealthKit();
      if (!HK) return false;
      return new Promise((resolve) => {
        HK.initHealthKit(
          {
            permissions: {
              read: [
                HK.PermissionKind.StepCount,
                HK.PermissionKind.Weight,
                HK.PermissionKind.Workout,
              ],
              write: [
                HK.PermissionKind.Workout,
                HK.PermissionKind.Weight,
              ],
            },
          },
          (err: string) => {
            if (err) {
              console.warn('[Health] iOS init error:', err);
              resolve(false);
            } else {
              resolve(true);
            }
          },
        );
      });
    }

    if (Platform.OS === 'android') {
      const HC = getHealthConnect();
      if (!HC) return false;
      await HC.initialize();
      const result = await HC.requestPermissions([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'ExerciseSession' },
        { accessType: 'write', recordType: 'ExerciseSession' },
        { accessType: 'write', recordType: 'Weight' },
      ]);
      return result && result.length > 0;
    }

    return false;
  } catch (e) {
    console.warn('[Health] Permission request failed:', e);
    return false;
  }
}

export async function readTodaySteps(): Promise<number> {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (Platform.OS === 'ios') {
      const HK = getHealthKit();
      if (!HK) return 0;
      return new Promise((resolve) => {
        HK.getStepCount(
          { startDate: startOfDay.toISOString(), endDate: now.toISOString() },
          (err: string, result: { value: number }) => {
            if (err) {
              console.warn('[Health] iOS step count error:', err);
              resolve(0);
            } else {
              resolve(Math.round(result?.value ?? 0));
            }
          },
        );
      });
    }

    if (Platform.OS === 'android') {
      const HC = getHealthConnect();
      if (!HC) return 0;
      const result = await HC.readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay.toISOString(),
          endTime: now.toISOString(),
        },
      });
      return result.reduce((sum: number, r: any) => sum + (r.count ?? 0), 0);
    }

    return 0;
  } catch (e) {
    console.warn('[Health] readTodaySteps failed:', e);
    return 0;
  }
}

export async function readLatestWeight(): Promise<{ value: number; date: string } | null> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    if (Platform.OS === 'ios') {
      const HK = getHealthKit();
      if (!HK) return null;
      return new Promise((resolve) => {
        HK.getLatestWeight(
          { unit: 'kg' },
          (err: string, result: { value: number; startDate: string }) => {
            if (err || !result) {
              resolve(null);
            } else {
              resolve({
                value: Math.round(result.value * 10) / 10,
                date: result.startDate.slice(0, 10),
              });
            }
          },
        );
      });
    }

    if (Platform.OS === 'android') {
      const HC = getHealthConnect();
      if (!HC) return null;
      const result = await HC.readRecords('Weight', {
        timeRangeFilter: {
          operator: 'between',
          startTime: thirtyDaysAgo.toISOString(),
          endTime: now.toISOString(),
        },
        ascendingOrder: false,
        pageSize: 1,
      });
      if (result.length === 0) return null;
      const r = result[0];
      return {
        value: Math.round((r.weight?.inKilograms ?? r.weight) * 10) / 10,
        date: r.time?.slice(0, 10) ?? dateStr(),
      };
    }

    return null;
  } catch (e) {
    console.warn('[Health] readLatestWeight failed:', e);
    return null;
  }
}

export async function writeWorkout(entry: ExerciseEntry): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const HK = getHealthKit();
      if (!HK) return false;
      const workoutType = SPORT_TO_HK_WORKOUT[entry.sportKey] ?? 'other';
      return new Promise((resolve) => {
        HK.saveWorkout(
          {
            type: workoutType,
            startDate: new Date(entry.timestamp).toISOString(),
            endDate: new Date(entry.timestamp + entry.durationSec * 1000).toISOString(),
            energyBurned: entry.calories ?? 0,
            energyBurnedUnit: 'kcal',
            distance: entry.distanceKm ?? 0,
            distanceUnit: 'km',
          },
          (err: string) => {
            if (err) {
              console.warn('[Health] iOS saveWorkout error:', err);
              resolve(false);
            } else {
              resolve(true);
            }
          },
        );
      });
    }

    if (Platform.OS === 'android') {
      const HC = getHealthConnect();
      if (!HC) return false;
      const exerciseType = SPORT_TO_HC_EXERCISE[entry.sportKey] ?? 'OtherWorkout';
      await HC.insertRecords([
        {
          recordType: 'ExerciseSession',
          exerciseType,
          startTime: new Date(entry.timestamp).toISOString(),
          endTime: new Date(entry.timestamp + entry.durationSec * 1000).toISOString(),
          energy: entry.calories
            ? { value: entry.calories, unit: 'kilocalories' }
            : undefined,
          distance: entry.distanceKm
            ? { value: entry.distanceKm * 1000, unit: 'meters' }
            : undefined,
          title: entry.sportKey,
        },
      ]);
      return true;
    }

    return false;
  } catch (e) {
    console.warn('[Health] writeWorkout failed:', e);
    return false;
  }
}

export async function performHealthSync(store: {
  healthSyncEnabled: boolean;
  checkinHistory: { date: string; weight?: number }[];
  setTodaySteps: (n: number) => void;
  syncWeightFromHealth: (w: number) => void;
}): Promise<void> {
  if (!store.healthSyncEnabled || !isHealthAvailable()) return;

  try {
    // Read steps
    const steps = await readTodaySteps();
    store.setTodaySteps(steps);

    // Read weight — only if user hasn't entered weight today
    const today = dateStr();
    const todayCheckin = store.checkinHistory.find((c) => c.date === today);
    if (!todayCheckin?.weight) {
      const weight = await readLatestWeight();
      if (weight && weight.date === today) {
        store.syncWeightFromHealth(weight.value);
      }
    }
  } catch (e) {
    console.warn('[Health] performHealthSync failed:', e);
  }
}
