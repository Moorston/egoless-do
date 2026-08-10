# 调眠页睡觉提醒全维度优化

## Goal

将现有的单一时间点睡觉提醒升级为多阶段、智能、沉浸式的睡眠提醒系统，覆盖 UI 增强、策略增强、交互增强、通知内容优化四个维度。

## Background

当前实现（`useSleepNotifications.ts` + `HomePage.tsx`）：
- 2 个时间点提醒（睡前 N 分钟 + 准时）
- 前台接收 → 显示简单 Modal（moon icon + 时间 + 开始仪轨/忽略）
- 1 分钟无操作自动记录入睡
- 后台点击通知 → 跳转

**问题**：
- Modal UI 简单（无呼吸动画、无进度条、无沉浸感）
- 提醒策略单一（仅 2 个时间点，无周末差异化，无智能跳过）
- 交互薄弱（无 Snooze、无快速开始仪轨、无跳过今晚）
- 通知内容单薄（无时辰/脏腑信息、无 deep link）

## Requirements

### R1：全屏沉浸 UI 升级

- 全屏暗色背景（深蓝/深紫渐变）
- 月亮呼吸动画（scale 1 → 1.08 → 1，4s 周期）
- 显示当前时辰名 + 脏腑 + 修行建议（从 BODY_CLOCK 获取）
- 环形进度条（60s 自动记录倒计时）
- 主 CTA 按钮"开始睡眠仪轨"（带箭头）
- 辅助按钮：稍后提醒（Snooze）、跳过今晚

### R2：多阶段提醒策略

- 支持 3 个提醒阶段：睡前 30min / 15min / 5min（可配置）
- 准时提醒（ bedtime ）
- 智能跳过：当天已记录睡眠 → 不再提醒
- 周末差异化：可设置独立的周末目标入睡时间
- 自定义提醒阶段数量（1-5 个）

### R3：交互增强

- **Snooze（稍后提醒）**：点击后 10 分钟后再提醒
- **快速开始仪轨**：Modal 内直接开始 15/20/30 分钟仪轨
- **跳过今晚**：今晚不再提醒
- **倒计时进度条**：环形进度 + 秒数显示

### R4：通知内容优化

- 通知标题/正文包含时辰名 + 脏腑信息
  - 例："🌙 距离子时入睡还有 30 分钟，胆经当令，宜准备放下手机"
- 带 deep link 直接跳到 SleepEngine
- 不同阶段提醒文案不同（30min 温和 / 5min 紧迫）

### R5：Store 扩展

- `sleepGoal` 新增字段：
  - `weekendBedtime?: string`（周末目标入睡）
  - `weekendWake?: string`（周末目标起床）
  - `reminderStages?: number[]`（默认 [30, 15, 5]）
  - `snoozeCount?: number`（今晚已 snooze 次数，最大 3）

## Constraints

- 复用现有 `expo-notifications` 基础设施
- 复用现有 `useSleepNotifications` hook 框架
- 全屏 Modal 组件化（可复用）
- 向后兼容：旧版 `reminderBeforeMin` 字段仍支持
- 通知权限保持现有请求流程

## Out of Scope

- 智能入睡检测（需硬件/HealthKit）
- 社交功能（提醒好友）
- 睡眠质量预测
- Android 通知渠道细分

## Acceptance Criteria

- [ ] **AC1**：全屏提醒 Modal 显示暗色背景 + 呼吸月亮动画 + 时辰信息 + 环形进度条
- [ ] **AC2**：支持 3 个提醒阶段（30/15/5min），可配置
- [ ] **AC3**：Snooze 功能：点击后 10min 后再提醒，最多 3 次/晚
- [ ] **AC4**：快速开始仪轨：Modal 内 15/20/30 分钟按钮
- [ ] **AC5**：跳过今晚：今晚剩余提醒全部取消
- [ ] **AC6**：智能跳过：已记录睡眠当天不提醒
- [ ] **AC7**：周末差异化：独立设置周末 bedtime/wake
- [ ] **AC8**：通知内容包含时辰名 + 脏腑 + 阶段化文案
- [ ] **AC9**：deep link 点击通知 → 跳转 SleepEngine
- [ ] **AC10**：向后兼容旧版 sleepGoal.reminderBeforeMin
- [ ] **AC11**：现有测试通过，零新增失败
- [ ] **AC12**：lint 零错误

## Verification

手动测试路径：
1. 设置 bedtime 为当前时间 +2min → 触发提醒 → 验证全屏 UI
2. 点击 Snooze → 10min 后再次提醒
3. 点击快速开始仪轨 → 进入 SleepEngine barrier
4. 记录睡眠 → 当天不再提醒
5. 设置周末 bedtime → 周末触发独立提醒
6. 点击通知 → deep link 跳转正确
