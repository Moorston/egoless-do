# 修复全面扫描发现的24个bug

## Goal
修复全面代码扫描发现的24个bug，优先修复HIGH级别（数据丢失/功能失效），然后MEDIUM，最后LOW。

## HIGH — 数据丢失或功能完全失效（6个）

- [ ] **H1** `SyncEngine.ts:556` — INSERT缺`deleted=0`，同步记录不可见
- [ ] **H2** `SyncEngine.ts:770-819` — 冲突解决未用`mergeFieldLevel()`，本地数据被覆盖
- [ ] **H3** `zhiguanHistory.ts` 多处 — `toISOString()` UTC日期 vs 全局本地日期
- [ ] **H4** `SportPage.tsx:86` + `MeditationScreen.tsx:72` — heartbeat ref始终null
- [ ] **H5** `MindTrailScreen.tsx:60` — 智能查询无unmount abort
- [ ] **H6** `SyncEngine.ts:640-649` — 崩溃后syncing状态队列项未重置

## MEDIUM — 数据丢失或功能异常（10个）

- [ ] **M1** `createDedicationSlice.ts:49` — `updateDedicationSettings`缺persistChange
- [ ] **M2** `createSleepSlice.ts:103` — `setSleepGoal`缺persistChange
- [ ] **M3** `createPlanSlice.ts:46-62` — `toggleCheckin`更新进度不持久化plan
- [ ] **M4** `SyncEngine.ts:959-968` — `purgeDeletedRecords`与sync_queue竞态
- [ ] **M5** `reflections.ts:128,159` — `r.tags.some()`缺`?? []`保护
- [ ] **M6** `HomeScreen.tsx:369` — `dayBeforeYesterdayStr`用`[]`依赖
- [ ] **M7** `SutraScreen.tsx:44` — 退出屏幕未停止音频
- [ ] **M8** `BreathingEngine.tsx:272` — holdAnim listener未unmount清理
- [ ] **M9** `createMindSlice.ts:73` — persistChange在set() updater内
- [ ] **M10** `useSync.ts:119-130` — delta合并排序错乱

## LOW — 边界情况（8个）

- [ ] **L1** `SportPage.tsx:110` — 防抖定时器unmount未清理
- [ ] **L2** `SportPage.tsx:89` — session创建effect依赖不完整
- [ ] **L3** `SportPage.tsx:89` — 并发createSession竞态
- [ ] **L4** `ReflectionsScreen.tsx:146` — showNew重复竞争effect
- [ ] **L5** `ReflectionsScreen.tsx:159` — AsyncStorage回调unmount后setState
- [ ] **L6** `SyncEngine.ts:266,850` — saveLastSyncAt竞态
- [ ] **L7** `createPlanSlice.ts:49` — computePlanProgress用旧state
- [ ] **L8** `createRecycleBinSlice.ts:109` — 回收站删除可能不持久化

## Acceptance Criteria
- [ ] 所有HIGH bug已修复
- [ ] 所有MEDIUM bug已修复
- [ ] `pnpm test` 无新增失败
- [ ] TypeScript编译无新增错误
