## Why

用户需要及时的提醒来维持习惯的连续性。目前应用缺少推送通知功能，用户容易忘记打卡或完成计划任务，导致习惯中断。添加通知系统可以提高用户参与度和习惯养成成功率。

## What Changes

- 添加本地推送通知功能，支持定时提醒
- 实现可配置的通知计划（每日、每周、自定义）
- 添加通知权限管理
- 支持通知内容个性化（基于用户习惯和计划）
- 添加通知历史记录

## Capabilities

### New Capabilities
- `notification-scheduling`: 通知调度系统，支持定时、重复和自定义通知
- `notification-content`: 通知内容生成，基于用户习惯和计划生成个性化提醒
- `notification-permissions`: 通知权限管理，处理系统权限请求和用户偏好设置

### Modified Capabilities
- `plan-management`: 添加计划任务的通知触发点
- `checkin-frequency`: 基于打卡频率生成智能提醒

## Impact

- **Mobile**: 主要影响 Expo 移动端，需要集成 expo-notifications
- **Web**: PWA 支持有限，主要依赖浏览器通知 API
- **Backend**: PocketBase 需要添加通知配置存储
- **依赖**: 添加 expo-notifications、expo-device 等依赖包
- **权限**: 需要请求通知权限，影响用户体验流程
