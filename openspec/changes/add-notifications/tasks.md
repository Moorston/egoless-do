## 1. 基础设施设置

- [ ] 1.1 添加 expo-notifications 和 expo-device 依赖到 apps/mobile/package.json
- [ ] 1.2 创建 PocketBase migration 添加 notifications 集合（backend/pb_migrations/）
- [ ] 1.3 在 packages/core/src/types 中定义 Notification 接口
- [ ] 1.4 在 packages/core/src/services 中创建 notificationService 基础结构

## 2. 通知权限管理

- [ ] 2.1 实现 notification-permissions spec 中的权限请求逻辑（packages/core/src/services/notification.ts）
- [ ] 2.2 创建权限状态管理 hook（apps/mobile/src/hooks/useNotificationPermission.ts）
- [ ] 2.3 实现权限拒绝后的引导 UI（apps/mobile/src/components/NotificationPermissionGuide.tsx）
- [ ] 2.4 添加权限状态持久化到 AsyncStorage

## 3. 通知调度系统

- [ ] 3.1 实现 notification-scheduling spec 中的调度配置数据模型
- [ ] 3.2 创建通知调度服务（packages/core/src/services/notificationScheduler.ts）
- [ ] 3.3 实现本地通知注册和取消逻辑
- [ ] 3.4 添加调度配置 CRUD 操作到 PocketBase

## 4. 通知内容生成

- [ ] 4.1 实现 notification-content spec 中的内容生成逻辑（packages/core/src/services/notificationContent.ts）
- [ ] 4.2 创建通知内容模板系统
- [ ] 4.3 实现基于用户行为的个性化内容调整
- [ ] 4.4 添加通知内容缓存机制

## 5. 计划管理集成

- [ ] 5.1 修改 Plan 数据模型添加 notificationConfig 字段（packages/core/src/types/plan.ts）
- [ ] 5.2 实现 plan-management spec 中的通知触发逻辑
- [ ] 5.3 添加计划任务到期前提醒功能
- [ ] 5.4 实现计划通知管理 UI（apps/mobile/src/components/PlanNotificationSettings.tsx）

## 6. 打卡频率集成

- [ ] 6.1 实现 checkin-frequency spec 中的智能提醒逻辑
- [ ] 6.2 添加基于频率的通知调度同步
- [ ] 6.3 实现打卡频率统计通知（连续打卡祝贺等）
- [ ] 6.4 添加任务完成时自动停止通知的逻辑

## 7. 用户界面

- [ ] 7.1 创建通知设置主页面（apps/mobile/src/screens/NotificationSettingsScreen.tsx）
- [ ] 7.2 实现通知列表展示组件
- [ ] 7.3 添加通知编辑/创建表单
- [ ] 7.4 集成通知设置到应用设置页面

## 8. 测试和优化

- [ ] 8.1 编写通知服务单元测试（packages/core/src/services/__tests__/notification.test.ts）
- [ ] 8.2 进行跨平台测试（iOS 和 Android）
- [ ] 8.3 性能优化：电池消耗和调度效率
- [ ] 8.4 用户测试和反馈收集

## 9. 文档和发布

- [ ] 9.1 更新用户文档说明通知功能
- [ ] 9.2 添加通知功能的使用指南
- [ ] 9.3 准备渐进式发布策略
- [ ] 9.4 监控和错误跟踪设置
