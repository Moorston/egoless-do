# 672 类型错误修复计划

## 错误分布

| 类别 | 数量 | 比例 | 修复策略 |
|------|------|------|---------|
| **TS7006 + TS18046** | 903 | 82% | 创建类型化 wrapper —— `useAppStoreShallow` |
| **TS7053 (Element any)** | 24 | 2% | `as keyof Type` 断言 |
| **TS2345 (参数类型)** | 33 | 3% | 逐一修复 |
| **TS2322 (赋值类型)** | 19 | 2% | 逐一修复 |
| **TS2339 (缺属性)** | 14 | 1% | 补充类型字段 |
| **TS2769 (重载)** | 13 | 1% | 逐一修复 |
| **TS2304 (缺名称)** | 5 | <1% | 修复 import |
| **其他** | 10 | <1% | 逐一修复 |
| **预存（非mobile）** | 16 | <1% | 最小修复 |
| **node_modules** | 2 | <1% | tsconfig skipLibCheck 应已处理 |

## 核心修复：useAppStoreShallow wrapper

**根因**：`useAppStore(useShallow(s => {...}))` 中 TypeScript 无法通过 `useShallow` 的函数类型参数正确推断 `s`。

**方案**：创建类型化 wrapper，显式绑定 `MobileStore` 类型。

```typescript
// apps/mobile/src/store/useAppStore.ts 尾部追加

/** useShallow 的类型安全版本。显式绑定 MobileStore 类型。 */
export function useShallowStore<U>(selector: (state: MobileStore) => U): U {
  return useAppStore(useShallow(selector));
}
```

然后全局替换 `useAppStore(useShallow(` → `useShallowStore(`。

**预期效果**：一次性消除 ~903 个 TS7006 + TS18046 类型错误。

## 剩余 196 错误分文件修复

按错误数排序：

| 文件 | 错误数 | 主要问题 |
|------|--------|---------|
| apps/mobile/src/features/stats/StatsScreen.tsx | 39 | 重载+索引类型 |
| apps/mobile/src/features/mind/MindScreen.tsx | 21 | + 索引+重载 |
| apps/mobile/src/features/sutra/SutraHistoryScreen.tsx | 19 | useShallow+索引 |
| apps/mobile/src/features/practice/PreceptScreen.tsx | 19 | useShallow+索引 |
| apps/mobile/src/features/reflections/insights/ReflectionStatsScreen.tsx | 18 | useShallow |
| apps/mobile/src/features/home/components/CheckinModal.tsx | 18 | FoodItem 类型 |
| apps/mobile/src/features/home/components/ReviewView.tsx | 15 | useShallow+属性 |
| apps/mobile/src/features/diet/DietScreen.tsx | 15 | 索引+Wuxing |
| apps/mobile/src/features/settings/ProfileScreen.tsx | 14 | useShallow |
| apps/mobile/src/features/home/screens/HomeScreen.tsx | 14 | useShallow + FoodItem |
| apps/mobile/src/features/home/screens/FoodLogPage.tsx | 14 | FoodItem 类型 |
| apps/mobile/src/features/practice/PreceptHistoryPage.tsx | 13 | useShallow |
| apps/mobile/src/features/plan/PlanCreateScreen.tsx | 13 | useShallow |
| ... | 10-12 | useShallow 为主体 |

## 实施步骤

1. 创建 `useShallowStore` wrapper
2. 正则替换所有 `useAppStore(useShallow(` → `useShallowStore(`
3. 添加 import: `import { useShallowStore }` 相关文件
4. 逐一修复 196 个非 TS7006/TS18046 错误
5. 验证 type-check 为零错误

**预计工作量**：2-3 小时