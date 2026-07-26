# 调眠页首页优化 — 执行计划（收尾收敛版）

> 状态：**已完成（v1 已提交）**。下列步骤均已落地，对应提交见各步。

## 执行清单（实际落地）

### Step 1: 提取 HomePage 组件 ✅
- `SleepEngine.tsx` 首页渲染提取为 `HomePage.tsx`；`SleepEngine` 仅保留状态机路由（174 行）。
- 提交：`55551a73` 等

### Step 2: 视觉基调 ✅（偏离）
- 采用全局主题色（`TH.bg`/`TH.card`/`TH.primary`），**未**采用原定的 `#0a0a1a` 独立夜间背景。
- 提交：`d12171b4 refactor(sleep): 首页背景色改为主题色`

### Step 3: SleepSummaryCard ✅
- 置顶；时长/质量星/时间轴/仪轨状态；点击 → `DiaryModal`；空状态提示。

### Step 4: BodyClockCard ✅
- 12 圆点可点击 → `clockDetail` Modal；当前时辰高亮；倒计时。

### Step 5: SleepGoalCard ✅
- 编辑 Modal：`HH:MM` 校验 + 时长 clamp → `setSleepGoal`。

### Step 6: QuickDiary ✅
- 5 星 + 4 选 1 工作状态 → `saveSleepDiary({ quality, workState })`；「完整日记」→ `DiaryModal`。

### Step 7: RitualEntrance ✅
- 15/20/30 分钟 + 快速感恩；主题色视觉，功能不变。

### Step 8: TrendChart ✅
- 近 7 天纯 `View` 柱状图，`barColor` 随质量/时长变化；平均时长；点击 → `trendDetail` Modal。

### Step 9: StreakBar ✅
- `sleepStreak > 0` 显示「🔥 连续记录 X 天」+ 历史入口。

### Step 10: 集成与回归 ✅
- 所有 callback 正确传递；仪轨/感恩/报告流程不受影响；DiaryModal 正常。
- 提交：`a3febe05 fix(sleep): 修复 code review 发现的问题`

## 验证命令（建议最终门禁）

```bash
pnpm run type-check   # 类型检查
pnpm run test         # 单元测试
pnpm run mobile       # 手动走通主路径
```

> 收尾时以代码审查 + git 历史核对完成验证；运行类型检查 / 测试作为正式发布前的最后门禁（由用户执行）。

## 回滚点

| 风险 | 回滚方案 |
|------|----------|
| 任一功能回归 | `git revert <对应提交>`（提交均原子化） |
| 主题色决策回退到独立夜间背景 | 反向 `d12171b4` 的改动，恢复 `#0a0a1a` 背景 |

## 后续（非阻塞，可另开任务）

- 强化「夜间沉浸感」：Page-level 深色背景 + 柔光（独立于当前主题系统）。
- `HomePage.tsx` 拆分：各 Card 抽到 `features/sleep/components/*.tsx`（宪法 §2.1）。
