# 执行计划 — 修复 AppHeader streak 不一致

## 1. 执行策略

分两步：先切换数据源（R1+R2，立即生效），再清理冗余（R3，彻底消除隐患）。每步独立可验证。

## 2. 任务清单

### Task 1：AppHeader 改用 useCheckinStreak

**目标**：AppHeader 右上角 streak 与首页一致。

**改动文件**：`apps/mobile/src/components/AppHeader.tsx`

**步骤**：
1. 添加 import：`import { useCheckinStreak } from '../store/selectors';`
2. 删除 `streak` 的 `useShallowStore` 订阅
3. 新增 `const streak = useCheckinStreak();`

**验证**：
- 编译通过
- AppHeader 显示正确 streak

**回滚点**：git commit `fix(header): AppHeader streak 改用 useCheckinStreak selector`

---

### Task 2：SimpleHeader 改用 useCheckinStreak

**目标**：SimpleHeader streak 与首页一致。

**改动文件**：`apps/mobile/src/navigation/SimpleHeader.tsx`

**步骤**：同 Task 1

**验证**：同 Task 1

**回滚点**：git commit `fix(header): SimpleHeader streak 改用 useCheckinStreak selector`

---

### Task 3：清理 createCheckinSlice 冗余 streak

**目标**：移除 checkin slice 中全局 streak 字段的初始值、写入、calculateStreak 方法。

**改动文件**：`packages/core/src/store/createCheckinSlice.ts`

**步骤**：
1. 初始状态移除 `streak: 0,`
2. `submitCheckin` 的 `set` 移除 `streak: result.streak`
3. rollback 移除 `streak: calculateCheckinStreak(...)`
4. `calculateStreak()` 方法移除（或标记 `@deprecated` 并留空实现）

**验证**：
- 编译通过
- 现有测试通过（检查 `createCheckinSlice.test.ts` 是否有 `streak` 断言）

**回滚点**：git commit `refactor(store): 移除 createCheckinSlice 冗余 streak 字段`

---

### Task 4：清理 createMobileUiSlice streak 写入

**目标**：移除 mobile UI slice 中 streak 写入。

**改动文件**：`apps/mobile/src/store/createMobileUiSlice.ts`

**步骤**：移除 `streak: result.streak,`（第 76 行）

**验证**：编译通过

**回滚点**：随 Task 3 一起提交

---

### Task 5：清理类型定义和 Schema

**目标**：移除 CheckinSlice 类型中的 streak 字段，移除 Zod schema 中的 streak。

**改动文件**：
- `packages/core/src/store/types.ts`（CheckinSlice 接口）
- `packages/core/src/zod/schemas.ts`（settingsSchema）

**步骤**：
1. `CheckinSlice` 接口移除 `streak: number;`
2. `settingsSchema` 移除 `streak: z.number().optional(),`

**验证**：type-check 通过

**回滚点**：随 Task 3 一起提交

---

### Task 6：更新/检查测试

**目标**：确保现有测试通过，无 `store.streak` 相关断言。

**改动文件**：
- `packages/core/src/store/createCheckinSlice.test.ts`（若有 `streak` 断言）
- `packages/core/src/store/createCheckinSlice.optimistic.test.ts`（若有 `calculateStreak` 测试）

**步骤**：
1. 运行 `pnpm run test`
2. 检查失败测试，更新断言
3. 若无失败，跳过

**验证**：测试通过

**回滚点**：随 Task 3 一起提交

---

### Task 7：全量回归验证

**目标**：确认改动无回归。

**步骤**：
1. `pnpm run test` — 全部测试通过
2. `pnpm run lint` — 零错误
3. `pnpm run type-check` — 零错误（mobile 包）
4. 手动验证（若可能）：冷启动、打卡、杀进程重启

**验证**：AC1-AC9 全部满足

## 3. 验证命令速查

```bash
pnpm run test          # 单元测试
pnpm run lint          # ESLint
pnpm run type-check    # TypeScript 类型检查
```

## 4. 关键回滚点

若实现过程中遇到不可预见问题，按 Task 序号逐个回滚：

```bash
git log --oneline  # 找到各任务 commit hash
git revert <hash>  # 回滚单个任务
```

## 5. 完成定义（DoD）

- [ ] AC1-AC9 全部满足
- [ ] `pnpm run test` 通过
- [ ] `pnpm run lint` 无错误
- [ ] `pnpm run type-check` 无错误（mobile 包）
- [ ] 无 `store.streak` 读取点残留（grep 验证）
