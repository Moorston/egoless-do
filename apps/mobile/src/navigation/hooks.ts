import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import type { RootStackParamList, MainTabParamList } from './types';

export type { RootStackParamList, MainTabParamList } from './types';

/** Typed navigation hook for the root stack */
export function useRootNavigation() {
  return useNavigation<NavigationProp<RootStackParamList>>();
}

/** Typed navigation hook for the main tabs */
export function useTabNavigation() {
  return useNavigation<NavigationProp<MainTabParamList>>({ id: 'main-tabs' });
}
