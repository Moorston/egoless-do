# 修复 AppHeader 右上角连续打卡天数与首页不一致

## Goal

统一 AppHeader / SimpleHeader 的连续打卡天数数据源，使其与 HomeScreen 的 `useCheckinStreak()` selector 一致，消除冗余存储导致的滞后问题。

## Background

**现象**：AppHeader 右上角的连续打卡天数 ≠ 首页打卡统计 banner 的连续打卡天数。

**根因**：存在两套 streak 数据流

| 数据流 | 数据源 | 更新时机 | 当前使用者 |
|--------|--------|----------|-----------|
| `store.streak` | 冗余存储字段 | 仅 `submitCheckin` 乐观更新 / `calculateStreak()` | AppHeader、SimpleHeader |
| `useCheckinStreak()` selector | 从 `checkinHistory` 派生 | 每次渲染 useMemo 重算 | HomeScreen banner |

`initApp.ts:481` 注释明确："不再在 initApp 中同步计算 calculateStreak"。因此：
- **rehydration 后**：`checkinHistory` 从 SQLite 加载，但 `store.streak` 未重算 → 不一致
- **同步拉取后**：远端 checkin 更新 `checkinHistory`，但 `store.streak` 未重算 → 不一致

## Requirements

### R1：AppHeader 改用派生 selector

- `AppHeader.tsx` 将 `useShallowStore(s => s.streak)` 改为 `useCheckinStreak()`
- 显示逻辑保持不变（数字 + 火焰图标）

### R2：SimpleHeader 改用派生 selector

- `SimpleHeader.tsx` 将 `useShallowStore(s => s.streak)` 改为 `useCheckinStreak()`
- 显示逻辑保持不变

### R3：清理冗余 store 字段（可选，推荐）

- `createCheckinSlice.ts` 初始状态移除 `streak: 0`
- `submitCheckin` 返回值不再设置 `streak` 字段
- `rollback` 不再计算 `streak`
- `calculateStreak()` 方法标记 deprecated 或直接移除（确认无其他调用方后）
- `createMobileUiSlice.ts:76` 移除 `streak: result.streak`
- Zod schema `settingsSchema` 移除 `streak` 字段

### R4：不破坏 checkin record 上的 per-record streak

- `CheckinEntry.streak` 字段**保留**（单条记录自己的 streak，用于历史记录展示）
- `submitCheckinEntry` 仍计算 `record.streak` 并写入 store
- 仅移除全局 `store.streak`

## Constraints

- **不改动 streak 算法**：`calculateCheckinStreak` / `calculateStreakFromCheckins` 逻辑不变
- **不改动 HomeScreen**：它已经用 selector，无需修改
- **保持向后兼容**：若其他模块读 `store.streak`，需确认并迁移

## Out of Scope

- streak 算法优化（grace day 处理、时区边界等）
- 其他模块的 streak 显示（HabitDetail、ReflectionStats 等各自有独立逻辑）
- checkin record 上的 per-record streak 字段

## Acceptance Criteria

- [ ] **AC1**：AppHeader 右上角 streak 与 HomeScreen banner streak 始终一致
- [ ] **AC2**：SimpleHeader streak 与 HomeScreen banner streak 始终一致
- [ ] **AC3**：冷启动后（rehydration 完成）AppHeader streak 正确
- [ ] **AC4**：同步拉取远端 checkin 后 AppHeader streak 正确
- [ ] **AC5**：打卡/取消打卡后 AppHeader streak 立即更新
- [ ] **AC6**：checkin record 上的 per-record streak 字段未被破坏（历史记录详情仍显示）
- [ ] **AC7**：现有测试通过（`pnpm run test`）
- [ ] **AC8**：lint 零错误（`pnpm run lint`）
- [ ] **AC9**：type-check 零错误（`pnpm run type-check`，mobile 包）

## Verification

手动测试路径：
1. 冷启动 → 进入首页 → 对比 AppHeader 与 banner streak
2. 打卡 → 两个位置都应 +1
3. 取消打卡（若支持）→ 两个位置都应 -1
4. 杀进程重启 → streak 仍一致
5. 触发同步（若有远端数据）→ streak 仍一致

自动化：
- 检查现有测试 `createCheckinSlice.test.ts` / `selectors.test.ts` 是否覆盖 streak 派生逻辑
- 若 R3 执行，需更新引用 `store.streak` 的测试
