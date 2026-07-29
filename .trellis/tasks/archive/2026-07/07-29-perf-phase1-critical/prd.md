# PRD: 性能优化 Phase 1（致命反模式 + 索引 + 动态 import）

## 背景
性能审计（`docs/performance/full-audit-2026-07-29.md`）发现 69 个问题，本 Phase 修复 5 个最高收益问题。

## 目标
- TTI 600ms → 350ms（-40%）
- 首屏 JS -850KB
- SQLite 查询 ↓60-80%

## 需求

### 1. 修复 persistChange 反模式
- **当前**: `storageAdapter.persistChange` 每次写入后立即 `flushNow()` + `saveDataToFile()`
- **期望**: 移除立即 flush，文件备份改为 AppState background 时批量
- **收益**: UI 写入延迟 ↓50-100×

### 2. WriteBatcher 单事务化
- **当前**: N 行 = N 次 BEGIN/COMMIT
- **期望**: 整个 batch 一个事务
- **收益**: SQLite 写入 ↑5-10×

### 3. 补 4 个缺失索引
- **当前**: checkin_records/thought_trails/habits/mind_reflections 全表扫描
- **期望**: 添加复合索引（deleted + 排序字段）
- **收益**: 冷启动查询 ↓60-80%

### 4. 移除未使用依赖
- **当前**: @gorhom/bottom-sheet、expo-localization、expo-status-bar 未使用
- **期望**: 移除
- **收益**: -110KB

### 5. Sentry/PostHog 动态 import
- **当前**: 顶层 import，阻塞首屏
- **期望**: 首屏后/用户同意后异步初始化
- **收益**: 首屏 -550KB

## 验收标准
- [ ] persistChange 移除 flushNow + saveDataToFile
- [ ] WriteBatcher 单事务批量写入
- [ ] 4 个索引添加到 migration
- [ ] 未使用依赖移除 + package.json 更新
- [ ] Sentry/PostHog 动态 import
- [ ] 全量测试通过（1832/1832）
- [ ] 无功能回归

## 影响范围
- `apps/mobile/src/store/storageAdapter.ts`
- `apps/mobile/src/store/WriteBatcher.ts`
- `apps/mobile/src/db/schema.ts`（migration）
- `apps/mobile/package.json`
- `apps/mobile/src/sentry.ts`
- `apps/mobile/src/analytics/posthog.ts`

## 工作量
- persistChange 修复: 4h
- WriteBatcher 事务化: 3h
- 索引添加: 1h
- 依赖移除: 0.5h
- 动态 import: 2h
- **总计: 8h**（含测试）

## 回滚点
revert 各文件即可恢复（每项改动独立）
