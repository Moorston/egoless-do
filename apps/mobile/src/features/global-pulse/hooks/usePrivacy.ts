import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@egoless-do/core';
import { UserPreferences } from '@egoless-do/core';
import { optOut, optIn, deleteGlobalData } from '../services/globalPulseApi';
import { getUserHash } from '../services/userHash';

const log = createLogger('GlobalPulse');

const STORAGE_KEY = 'global_pulse_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  show_on_global_map: true,
  global_map_intro_shown: false
};

interface UsePrivacyReturn {
  preferences: UserPreferences;
  isLoading: boolean;
  setShowOnMap: (show: boolean) => Promise<boolean>;
  markIntroShown: () => Promise<void>;
  deleteAllData: () => Promise<boolean>;
  resetPreferences: () => Promise<void>;
}

export function usePrivacy(): UsePrivacyReturn {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);
  const userHashRef = useRef<string>('');

  useEffect(() => {
    (async () => {
      try {
        userHashRef.current = await getUserHash();
      } catch (err) {
        log.warn('getUserHash error:', err);
      }
    })();
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      log.error(error, { message: 'Failed to load preferences' });
    }
  };

  const savePreferences = async (newPreferences: UserPreferences) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      log.error(error, { message: 'Failed to save preferences' });
    }
  };

  const setShowOnMap = useCallback(async (show: boolean): Promise<boolean> => {
    setIsLoading(true);

    try {
      const hash = userHashRef.current;
      if (!hash) return false;

      const response = show ? await optIn(hash) : await optOut(hash);

      if (response.success) {
        await savePreferences({
          ...DEFAULT_PREFERENCES,
          ...preferences,
          show_on_global_map: show
        });
        return true;
      } else {
        log.error(response.error, { message: 'Failed to update privacy setting' });
        return false;
      }
    } catch (error) {
      log.error(error, { message: 'Failed to update privacy setting' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

  const markIntroShown = useCallback(async () => {
    await savePreferences({
      ...preferences,
      global_map_intro_shown: true
    });
  }, [preferences]);

  const deleteAllData = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      const hash = userHashRef.current;
      if (!hash) return false;

      const response = await deleteGlobalData(hash);

      if (response.success) {
        await savePreferences({
          ...preferences,
          show_on_global_map: false
        });
        return true;
      } else {
        log.error(response.error, { message: 'Failed to delete data' });
        return false;
      }
    } catch (error) {
      log.error(error, { message: 'Failed to delete data' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

  const resetPreferences = useCallback(async () => {
    await savePreferences(DEFAULT_PREFERENCES);
  }, []);

  return {
    preferences,
    isLoading,
    setShowOnMap,
    markIntroShown,
    deleteAllData,
    resetPreferences
  };
}

export default usePrivacy;
