# PRD: 状态管理规范化

## 背景
当前状态管理存在冗余字段（如 habits.streak 与 checkins 重复计算），导致数据不一致风险。

## 目标
- 移除冗余字段，streak/progress 改为派生状态
- 添加 memoized selectors 优化性能
- 支持乐观更新（UI 立即响应，后台同步）
- 保证数据一致性（单一数据源）

## 需求

### 1. 移除冗余字段
- **当前**: habits 表存储 streak，checkins 表也计算 streak
- **期望**: 仅 checkins 表为 Source of Truth，streak 通过 selector 实时计算
- **影响**: createHabitSlice, createCheckinSlice

### 2. 添加 memoized selectors
- **当前**: 每次访问 streak 都重新计算
- **期望**: 使用 useMemo/reselect 缓存计算结果
- **影响**: 所有使用 streak/progress 的组件

### 3. 乐观更新支持
- **当前**: 写操作需等待 SQLite 完成
- **期望**: UI 立即更新，后台持久化，失败时回滚
- **影响**: 所有 Slice actions

### 4. 数据一致性保证
- **当前**: 多处可能更新同一数据
- **期望**: 单一更新路径，事务保证
- **影响**: WriteBatcher + Slice actions

## 验收标准
- [ ] habits 表移除 streak 字段
- [ ] streak 通过 selector 从 checkins 计算
- [ ] 添加 memoized selectors（streak, progress, totalMedMinutes）
- [ ] 乐观更新实现（set + persist + rollback）
- [ ] 全量测试通过（1856+）
- [ ] 无功能回归

## 影响范围
- `packages/core/src/store/createHabitSlice.ts`
- `packages/core/src/store/createCheckinSlice.ts`
- `packages/core/src/store/selectors.ts`（新增）
- `apps/mobile/src/features/habits/*`
- `apps/mobile/src/features/home/*`

## 工作量
- 移除冗余字段：3 天
- memoized selectors：2 天
- 乐观更新：2 天
- 测试 + 修复：3 天
- **总计：10 天（1-2 周）**

## 回滚点
各 slice 独立，可逐个 revert
