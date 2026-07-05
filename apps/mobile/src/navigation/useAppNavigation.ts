import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, MainTabParamList } from './types';

/**
 * 统一的导航 hook，支持 stack 和 tab 导航
 *
 * 解决 (nav as any).navigate('TabScreen') 的类型安全问题
 */
export function useAppNavigation() {
  return useNavigation<StackNavigationProp<RootStackParamList> & BottomTabNavigationProp<MainTabParamList>>();
}

/**
 * 跳转到主标签页
 *
 * 用于从 stack 页面跳转到 tab 页面时的类型安全调用
 */
export function useNavigateToTab() {
  const nav = useAppNavigation();

  return (screen: keyof MainTabParamList, params?: Record<string, unknown>) => {
    nav.navigate('MainTabs' as never, { screen, ...params } as never);
  };
}

/**
 * 从历史/详情页面返回主标签页
 */
export function useGoToMainTab() {
  const nav = useAppNavigation();

  return (tab: keyof MainTabParamList) => {
    nav.navigate('MainTabs' as never, { screen: tab } as never);
  };
}
