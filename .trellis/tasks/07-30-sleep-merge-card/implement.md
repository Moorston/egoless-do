# 调眠页昨晚睡眠卡片与快速记录合并 — 执行计划

## 1. 概述

将 prd.md 和 design.md 转化为可执行的步骤清单，按依赖关系排序，包含验证命令和回滚点。

## 2. 前置条件

- [x] prd.md 完成
- [x] design.md 完成
- [x] Trellis task 已创建（07-30-sleep-merge-card）
- [ ] task.py start 激活任务（planning → in_progress）

## 3. 执行步骤

### Phase 1：新建 SleepSummaryCard 组件

#### Step 1.1：创建文件骨架

**文件**：`apps/mobile/src/features/sleep/SleepSummaryCard.tsx`

- [ ] 创建文件，包含：
  - React 导入
  - 类型导入（SleepEntry, WorkState, Theme, FONT_*）
  - Props 接口定义
  - WORK_STATE_OPTIONS 常量
  - 组件主体框架（三态条件渲染）
  - StyleSheet 定义

**验证**：`pnpm run type-check` 通过（无类型错误）

#### Step 1.2：实现空态（Empty State）

**文件**：`SleepSummaryCard.tsx`

- [ ] 实现空态 JSX：
  - 标题"昨晚睡眠"
  - 整行可点区域（5 颗空星星 + 提示文案）
  - 点击触发 `enterEditMode()`

**验证**：手动运行 app，无数据时空态展示正确

#### Step 1.3：实现只读态（Read Mode）

**文件**：`SleepSummaryCard.tsx`

- [ ] 实现只读态 JSX：
  - 标题行："昨晚睡眠" + ✎ 编辑按钮
  - 时长大字（7h30m 格式）
  - 质量★ 展示（★★★★☆）
  - 入睡/起床时间行（🛌/☀️）
  - 工作状态标签（有值时显示，主色小字）
  - 仪轨✅ + 感恩×N

**验证**：有数据时只读态展示正确

#### Step 1.4：实现编辑态（Edit Mode）

**文件**：`SleepSummaryCard.tsx`

- [ ] 实现编辑态 JSX：
  - 标题行："昨晚睡眠" + ✕ 取消按钮
  - 时长（不可编辑）
  - 质量★ 可点击选择（1-5）
  - 入睡/起床时间（不可编辑，灰色显示）
  - 工作状态 chips（单选）
  - 保存按钮（quality>0 时可用）
  - "完整日记 →"链接

**验证**：编辑态交互正确

#### Step 1.5：实现状态管理逻辑

**文件**：`SleepSummaryCard.tsx`

- [ ] 实现 `enterEditMode()`：从 todaySleep 预填草稿
- [ ] 实现 `handleSave()`：调用 onSaveQuickDiary，成功则退出编辑态
- [ ] 实现 `handleCancel()`：退出编辑态
- [ ] 实现 `handleOpenFullDiary()`：调用 onOpenFullDiary
- [ ] 实现保存失败处理（Alert + 保留编辑态）

**验证**：状态切换逻辑正确

---

### Phase 2：修改 HomePage 集成新组件

#### Step 2.1：删除旧卡片代码

**文件**：`apps/mobile/src/features/sleep/HomePage.tsx`

- [ ] 删除原 SleepSummaryCard JSX（136-186 行）
- [ ] 删除原 QuickDiary JSX（247-279 行）
- [ ] 删除 `quickQuality` / `quickWorkState` 状态声明（115-116 行）
- [ ] 删除 `handleQuickSave` 函数（118-122 行）
- [ ] 删除 `WORK_STATE_OPTIONS` 常量（125-130 行）

**验证**：`pnpm run type-check` 通过

#### Step 2.2：导入并引用新组件

**文件**：`apps/mobile/src/features/sleep/HomePage.tsx`

- [ ] 添加导入：`import SleepSummaryCard from './SleepSummaryCard';`
- [ ] 在原位置插入 `<SleepSummaryCard>` 组件
- [ ] 传递 props：`todaySleep`、`onSaveQuickDiary`、`onOpenFullDiary`

**验证**：`pnpm run type-check` 通过，app 运行展示新卡片

#### Step 2.3：清理未使用的导入

**文件**：`apps/mobile/src/features/sleep/HomePage.tsx`

- [ ] 检查并删除因删除代码导致的未使用导入（如 Star 图标如果不再直接使用）

**验证**：`pnpm run lint` 无未使用导入警告

---

### Phase 3：样式微调与验证

#### Step 3.1：添加/调整样式

**文件**：`apps/mobile/src/features/sleep/sleepStyles.ts`

- [ ] 添加 SleepSummaryCard 专用样式（如 design.md 8.1 所列）
- [ ] 确保与现有卡片风格一致

**验证**：视觉检查

#### Step 3.2：手动功能验证

**验证清单**：

- [ ] AC1：HomePage 只显示一个新卡片（原两个区域消失）
- [ ] AC2：有数据时只读态展示质量★和工作状态
- [ ] AC3：无数据时空态可点击进入编辑态
- [ ] AC4：编辑态星星和工作状态预填正确
- [ ] AC5：保存按钮在 quality=0 禁用，quality>0 可用
- [ ] AC6：保存后自动回到只读态
- [ ] AC7：取消后数据不变
- [ ] AC8：完整日记链接打开 DiaryModal
- [ ] AC9：保存失败显示提示并保留编辑态
- [ ] AC10：新组件在独立文件

#### Step 3.3：回归测试

**验证清单**：

- [ ] AC11：仪轨入口正常
- [ ] AC11：完整日记功能正常
- [ ] AC11：睡眠目标卡片正常
- [ ] AC11：趋势图正常
- [ ] AC11：历史页入口正常
- [ ] AC12：`pnpm run test` 通过
- [ ] AC12：`pnpm run type-check` 通过

---

### Phase 4：提交准备

#### Step 4.1：最终检查

- [ ] 所有 AC 通过
- [ ] 无 console.log / console.warn
- [ ] 无未使用导入
- [ ] 代码符合项目规范（参考 .trellis/spec/governance/GLOBAL-CODE-STANDARDS.md）

#### Step 4.2：提交

- [ ] 提交消息格式：`feat(sleep): 合并昨晚睡眠卡片与快速记录为内联编辑卡片`
- [ ] 包含 Co-Authored-By 标记

## 4. 验证命令

```bash
# 类型检查
pnpm run type-check

# 单元测试
pnpm run test

# 代码风格检查
pnpm run lint

# 运行 app（手动验证）
pnpm run mobile
```

## 5. 回滚点

### 回滚策略

如果新组件存在严重问题，可以一键回滚：

1. **删除新文件**：`rm apps/mobile/src/features/sleep/SleepSummaryCard.tsx`
2. **恢复 HomePage**：`git checkout apps/mobile/src/features/sleep/HomePage.tsx`
3. **验证**：`pnpm run type-check` + `pnpm run test`

### 回滚触发条件

- 新卡片导致首屏渲染失败
- 保存功能异常导致数据丢失
- 编辑态无法退出

## 6. 工时估算

| 步骤 | 预估工时 |
|------|---------|
| Step 1.1-1.5：新建 SleepSummaryCard | 1-2 小时 |
| Step 2.1-2.3：修改 HomePage | 0.5 小时 |
| Step 3.1-3.3：样式与验证 | 0.5-1 小时 |
| Step 4.1-4.2：提交准备 | 0.5 小时 |
| **总计** | **2.5-4 小时** |

## 7. 依赖与阻塞

- 无外部依赖
- 无并行任务（单线执行）
- 不阻塞其他任务

## 8. 后续任务（不在本次范围）

- 跨天/补录场景支持
- 编辑态切换动画
- 卡片内时间编辑
- 工作状态快捷编辑
