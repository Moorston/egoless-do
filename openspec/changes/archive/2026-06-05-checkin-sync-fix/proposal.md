# 打卡联动同步修复

## 问题

首页打卡表单中的习惯打卡和计划待办项的状态与 Zustand store 不同步。当用户在 PlanDetailContent 或 HabitsScreen 页面打卡后，返回首页时显示的状态仍为旧值。

## 根因

Mobile HomeScreen 使用 `useState` 维护 `habitCheckins` 和 `planToggles` 本地状态，初始化一次后不再与 store 同步。这些本地状态"遮蔽"了 Zustand store 的真实数据。

## 修复范围

- `apps/mobile/src/features/home/HomeScreen.tsx`

## 修复方案

1. 移除 `habitCheckins` 本地状态，直接从 `store.habits` 的 `checkedDates` 读取
2. 移除 `planToggles` 本地状态，直接从 `planCheckins`（store）读取
3. 移除过时的同步 useEffect
4. 修复所有引用已删除状态的回调函数
5. 添加 `autoSyncPlanItems()` + `checkAutoStatus()` 挂载调用
