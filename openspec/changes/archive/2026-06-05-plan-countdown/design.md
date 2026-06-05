## Context

当前计划功能支持日期范围和进度显示，但缺少实时倒计时和主动提醒机制。用户无法直观了解计划剩余时间，计划超期后也缺乏提醒。

现有技术基础：
- 计划状态管理：`packages/core/src/business/plan.ts`
- 推送通知：`apps/mobile/src/features/notifications/NotificationService.ts`
- 邮件发送：`apps/web/src/app/api/auth/send-code/route.ts` (nodemailer)
- 首页提醒模式：宽限期提醒卡片（grace reminder）

## Goals / Non-Goals

**Goals:**
- 提供实时倒计时显示（精确到秒）
- 计划超期时自动发送邮箱提醒（一次）
- 首页显示延期提醒（每次打开 APP）
- 复用现有通知和邮件基础设施

**Non-Goals:**
- 不支持 Web 端
- 不支持自定义提醒频率
- 不支持计划暂停时的倒计时

## Decisions

### 1. 倒计时实现方案

**决策**: 使用 `useState` + `setInterval` 每秒更新倒计时状态

**理由**:
- 简单直接，无需额外依赖
- React Native 原生支持
- 已有类似模式（运动页面倒计时）

**替代方案**:
- `react-native-countdown-component` - 额外依赖，且功能过于复杂
- 动画驱动 - 不适合精确显示数字

### 2. 延期检测时机

**决策**: 在 `checkAutoStatus` 函数中检测延期，并在 store 层触发邮箱提醒

**理由**:
- `checkAutoStatus` 已在每日重置时调用
- 集中管理状态变更逻辑
- 避免分散的检测逻辑

**触发流程**:
```
checkAutoStatus() 
  → 检测到 endDate < today 
  → 标记为 delayed 
  → store 层调用 /api/plan/notify-delayed
```

### 3. 邮箱提醒防重复

**决策**: 在 Plan 对象中添加 `lastDelayedNotifyAt` 字段

**理由**:
- 数据持久化，跨会话保持
- 服务端可校验，避免重复发送
- 简单的时间戳比较

**替代方案**:
- 本地 AsyncStorage - 不可靠，可被清除
- 服务端单独记录表 - 过度设计

### 4. 首页提醒临时关闭

**决策**: 使用组件内 `useState` 管理关闭状态，不持久化

**理由**:
- 用户关闭后重新打开 APP 应再次提醒
- 符合"每天提醒直到用户处理"的需求
- 无需额外存储

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| setInterval 在后台可能被系统暂停 | 监听 AppState 变化，恢复时立即刷新 |
| 邮件发送失败 | 记录失败日志，下次检测时重试 |
| 用户邮箱未配置 | 检查 PocketBase 用户邮箱字段，无邮箱则跳过 |
| 多个计划同时超期 | 遍历所有活跃计划，每个独立提醒 |

## Migration Plan

1. Plan 类型新增 `lastDelayedNotifyAt` 可选字段
2. PocketBase 需要 migration 添加对应字段（如果使用 PocketBase 存储）
3. 代码向后兼容，旧数据该字段为 undefined
