# 迁移指南：unified-storage-refactor

## 概述

本次重构将应用的持久化层从 **AsyncStorage + SQLite 双轨** 统一为 **纯 SQLite**。这是一个破坏性变更，需要用户重新登录。

## 变更内容

### 存储架构
- **之前**: Zustand `persist` middleware → AsyncStorage (设置/UI) + SQLite (实体数据)
- **之后**: 所有数据通过 `StorageAdapter` → SQLite (app_state 表存设置，实体表存数据)

### 新增功能
- `useShallowStore()` — 类型安全的 Domain Selector Hook
- `useGlobalTick()` — 共享定时器，消除 N 个并发 setInterval
- `usePagination()` — FlatList 分页加载
- `initApp()` — 显式应用初始化，替代 onRehydrateStorage

### 移除的功能
- Zustand `persist` middleware (useAppStore 和 uiStore)
- AsyncStorage 直接使用（除迁移脚本外）
- `deleteReflectionLink` 方法
- `clearIgnoredRecPatterns` 方法

## 迁移步骤

### 自动迁移（首次启动）
应用首次启动时会自动执行：
1. `migrateAsyncStorageToSQLite()` — 迁移实体数据
2. `migrateSettingsToSQLite()` — 迁移设置数据
3. 验证迁移完整性
4. 清理旧 AsyncStorage 数据

### 手动迁移（如自动迁移失败）
1. 卸载应用
2. 重新安装
3. 重新登录

## 开发者指南

### 新的持久化模式
```typescript
// ❌ 旧方式 (AsyncStorage)
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('key', JSON.stringify(value));

// ✅ 新方式 (SQLite via adapter)
import { mobileStorageAdapter } from './storageAdapter';
await mobileStorageAdapter.persistSettings('key', value);
const value = await mobileStorageAdapter.getSettings('key');
```

### 新的 Store 订阅
```typescript
// ❌ 旧方式
import { useAppStore } from './store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
const { theme, language } = useAppStore(useShallow(s => ({ theme: s.theme, language: s.language })));

// ✅ 新方式
import { useShallowStore } from './store/useAppStore';
const { theme, language } = useShallowStore(s => ({ theme: s.theme, language: s.language }));
```

### 新的定时器模式
```typescript
// ❌ 旧方式 (每个组件一个 setInterval)
useEffect(() => {
  const interval = setInterval(() => setDuration(calc()), 1000);
  return () => clearInterval(interval);
}, []);

// ✅ 新方式 (共享定时器)
const tick = useGlobalTick(1000);
const duration = useMemo(() => calc(), [tick]);
```

## 回滚计划

如需回滚到旧版本：
1. 恢复 `useAppStore.ts` 中的 `persist` middleware
2. 恢复 `uiStore.ts` 中的 `persist` middleware
3. 移除 `initApp.ts`
4. 恢复 AsyncStorage 直接使用

每个 commit 独立，可逐个回滚。
