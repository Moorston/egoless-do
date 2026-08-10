# 执行计划 — 睡觉提醒全维度优化

## 1. 执行策略

分 5 个有序任务，每个独立可验证。

## 2. 任务清单

### Task 1：Store 类型扩展

**目标**：SleepGoal 新增字段。

**改动文件**：
- `packages/core/src/types/sleep.ts`
- `packages/core/src/business/sleep.ts`

**步骤**：
1. `SleepGoal` 接口新增 `weekendBedtime?` / `weekendWake?` / `reminderStages?`
2. `DEFAULT_SLEEP_GOAL` 新增 `reminderStages: [30, 15, 5]`

**验证**：type-check 通过

**回滚点**：git commit `feat(sleep): SleepGoal 类型扩展`

---

### Task 2：BedtimeReminderModal 全屏组件

**目标**：新建全屏沉浸 Modal 组件。

**改动文件**：
- `apps/mobile/src/features/sleep/components/BedtimeReminderModal.tsx`（新增）

**步骤**：
1. 创建组件结构（Props 接口）
2. 暗色全屏背景（SafeAreaView + 深色 bg）
3. 呼吸月亮 SVG（Animated 4s 循环）
4. 时辰名 + 脏腑 + 建议（从 BODY_CLOCK 获取）
5. 环形进度条（react-native-svg 60s 倒计时）
6. 主 CTA + 快速仪轨按钮（15/20/30）
7. Snooze + 跳过今晚按钮

**验证**：
- lint 零问题
- type-check 通过
- 视觉走查（手动）

**回滚点**：git commit `feat(sleep): BedtimeReminderModal 全屏组件`

---

### Task 3：useSleepNotifications 重写

**目标**：多阶段 + Snooze + skipTonight + 智能跳过。

**改动文件**：
- `apps/mobile/src/features/sleep/useSleepNotifications.ts`

**步骤**：
1. 重写 `scheduleReminders`：
   - 智能跳过（已睡眠 → return）
   - 周末判断（weekendBedtime）
   - 遍历 reminderStages 调度
   - 准时提醒
2. 新增 `snooze` 函数（10min 后单次提醒，限 3 次）
3. 新增 `skipTonight` 函数（取消今晚所有）
4. 升级通知内容（时辰 + 脏腑 + 阶段化文案）
5. 升级 60s 自动记录定时器（与 Modal 进度条联动）

**验证**：
- lint 零问题
- type-check 通过
- 手动：设置 +2min bedtime → 触发提醒

**回滚点**：git commit `feat(sleep): useSleepNotifications 多阶段升级`

---

### Task 4：HomePage 集成

**目标**：替换旧 Modal + 集成新组件。

**改动文件**：
- `apps/mobile/src/features/sleep/HomePage.tsx`

**步骤**：
1. 新增 import BedtimeReminderModal
2. 替换旧 `{showBedtimeModal && ...}` 为新组件
3. 传入 period（当前时辰）+ onStartRitual + onSnooze + onSkipTonight
4. 移除旧 `barrierCenter` / `barrierTime` 等 styles（若无其他使用）

**验证**：
- lint 零问题
- type-check 通过
- 集成测试：触发提醒 → 新 Modal 显示

**回滚点**：随 Task 3 一起提交

---

### Task 5：EditGoalModal 扩展

**目标**：睡眠目标弹窗支持周末 + 提醒阶段。

**改动文件**：
- `apps/mobile/src/features/sleep/HomePage.tsx`（EditGoalModal 部分）

**步骤**：
1. 新增 editWeekendBedtime / editWeekendWake state
2. 在弹窗中增加"周末目标"折叠区
3. 增加提醒阶段多选（15/30/60 分钟 checkbox）
4. saveGoal 时写入新字段

**验证**：
- lint 零问题
- type-check 通过
- 手动：打开目标弹窗 → 设置周末时间 → 保存

**回滚点**：git commit `feat(sleep): EditGoalModal 周末+阶段扩展`

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

- [ ] AC1-AC12 全部满足
- [ ] `pnpm run test` 通过（零新增失败）
- [ ] `pnpm run lint` 零错误
- [ ] `pnpm run type-check` 零错误
- [ ] 手动验证：提醒触发 → 全屏 UI → Snooze → 快速仪轨 → 跳过今晚
