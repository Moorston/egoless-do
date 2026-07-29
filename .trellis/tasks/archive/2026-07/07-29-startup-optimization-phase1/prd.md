# PRD: 启动速度优化 Phase 1

## 背景
当前冷启动 TTI ~1200ms，首屏渲染 ~800ms。用户反馈低端机启动慢。

## 目标
- TTI < 600ms（减少 50%）
- 首屏渲染 < 300ms

## 需求

### 1. 拆分关键/延迟实体加载
- **当前**: rehydrateFromDb() 加载 39 实体，全部完成才渲染
- **期望**: 关键实体（profile/habits/checkins/auth）先加载 → 渲染首屏 → 延迟加载其余 36 实体

### 2. 并行化迁移 + Token 加载
- **当前**: migrate → migrateSettings → flushWrites → loadSecureTokens（串行）
- **期望**: migrate + loadSecureTokens 并行

### 3. 派生状态懒加载
- **当前**: initApp 中同步 calculateStreak + calculateTotalMedMin
- **期望**: 各 Screen 首次 mount 时计算

## 验收标准
- [ ] rehydrateFromDb 支持参数指定加载哪些实体
- [ ] 首屏渲染前仅加载 ≤ 5 个关键实体
- [ ] 迁移 + Token 加载并行（Promise.all）
- [ ] calculateStreak / calculateTotalMedMin 延迟到 Screen mount
- [ ] 全量测试通过（1827/1827）
- [ ] 无功能回归

## 影响范围
- `apps/mobile/src/store/initApp.ts`（主改动）
- `apps/mobile/src/features/sync/SyncRehydrationManager.ts`（rehydrateFromDb 参数化）
- `apps/mobile/src/features/home/screens/HomeScreen.tsx`（streak 懒加载）
- `apps/mobile/src/features/meditation/MeditationScreen.tsx`（medMin 懒加载）

## 工作量
- 实体加载拆分: 4h
- 并行化: 1h
- 懒加载: 2h
- **总计: 7h**

## 回滚点
revert initApp.ts + SyncRehydrationManager.ts 即可恢复
