## Why

用户在使用计划功能时，缺乏对计划剩余时间的直观感知。当前页面只显示进度百分比和日期范围，无法实时了解距离计划结束还有多久，也缺乏计划超期后的主动提醒机制，导致用户可能错过计划节点。

## What Changes

- 在计划详情页（PlanDetailContent）的进度条下方添加实时倒计时显示
  - 根据计划状态显示不同倒计时：未开始（距离开始）、进行中（距离结束）、已超期（超期天数）
  - 精确到天:时:分:秒，每秒实时更新
  - 暂停/已完成/已取消状态不显示倒计时
- 在首页添加计划延期提醒卡片
  - 当计划超期时，每次打开 APP 都显示提醒
  - 用户可临时关闭，重新打开 APP 后再次显示
  - 点击跳转到计划详情页
- 新增后端 API 发送邮箱延期提醒
  - 计划超期时自动发送一次邮箱提醒
  - 使用现有 nodemailer 配置
  - 邮件内容包含计划名称和到期日期

**非目标：**
- 不支持计划暂停时的倒计时
- 不支持自定义提醒频率
- 不支持 Web 端（仅移动端）

## Capabilities

### New Capabilities
- `plan-countdown`: 计划倒计时显示功能，包括实时倒计时组件、首页延期提醒卡片、邮箱提醒 API

### Modified Capabilities
- `plan-management`: 扩展计划数据模型，新增 lastDelayedNotifyAt 字段用于控制邮箱提醒发送

## Impact

- **移动端**: `apps/mobile/src/features/plan/PlanDetailContent.tsx` - 添加倒计时组件
- **移动端**: `apps/mobile/src/features/home/HomeScreen.tsx` - 添加延期提醒卡片
- **后端**: `apps/web/src/app/api/plan/notify-delayed/route.ts` - 新增邮箱提醒 API
- **核心包**: `packages/core/src/types/plan.ts` - Plan 接口新增字段
- **核心包**: `packages/core/src/business/plan.ts` - 延期检测逻辑
- **核心包**: `packages/core/src/i18n/zh.ts` - 新增翻译键
