## Context

egoless-do 是一个个人成长与习惯追踪应用，目前缺少推送通知功能。用户需要及时的提醒来维持习惯的连续性。本设计将添加本地推送通知系统，支持定时提醒和个性化内容。

技术栈：
- Mobile: Expo 54 + React Native
- Backend: PocketBase (SQLite)
- 共享逻辑: packages/core

## Goals / Non-Goals

**Goals:**
- 实现本地推送通知，支持定时和重复提醒
- 提供可配置的通知计划（每日、每周、自定义）
- 生成个性化通知内容（基于用户习惯和计划）
- 处理通知权限管理
- 记录通知历史

**Non-Goals:**
- 不实现远程推送通知（需要服务器基础设施）
- 不实现通知分组或优先级系统
- 不实现跨设备通知同步
- 不实现通知模板编辑器

## Decisions

### 1. 使用 expo-notifications 而不是 react-native-push-notification

**决策**: 使用 Expo 官方的 expo-notifications 库

**理由**:
- 与 Expo SDK 54 完全兼容
- 统一的 API 处理 iOS 和 Android
- 支持本地通知调度
- 活跃维护和文档支持

**替代方案**:
- react-native-push-notification: 需要更多原生配置，与 Expo 集成复杂
- firebase-cloud-messaging: 需要远程服务器，超出当前范围

### 2. 本地调度而非服务器端调度

**决策**: 使用设备本地调度通知

**理由**:
- 无需服务器基础设施
- 离线可用
- 隐私友好（数据不离开设备）
- 实现简单

**替代方案**:
- 服务器端调度: 需要维护服务器，增加复杂性
- 推送服务: 需要网络连接，隐私问题

### 3. 数据模型设计

**决策**: 在 PocketBase 中添加 notifications 集合

**理由**:
- 统一数据存储
- 支持通知历史查询
- 便于备份和同步

**数据模型**:
```typescript
interface Notification {
  id: string
  userId: string
  title: string
  body: string
  scheduledAt: Date
  repeatType: 'none' | 'daily' | 'weekly' | 'custom'
  repeatDays?: number[] // 0-6, 0=Sunday
  relatedType: 'plan' | 'checkin' | 'habit'
  relatedId: string
  isActive: boolean
  lastTriggeredAt?: Date
  createdAt: Date
}
```

### 4. 权限处理策略

**决策**: 首次使用时请求权限，提供设置引导

**理由**:
- 避免启动时打扰用户
- 提供清晰的价值说明
- 允许用户稍后启用

**流程**:
1. 用户首次创建计划或习惯时，显示通知权限请求
2. 如果拒绝，提供设置页面引导
3. 记录权限状态，避免重复请求

### 5. 通知内容生成

**决策**: 在 packages/core 中实现通知内容生成逻辑

**理由**:
- 跨平台共享
- 可测试性
- 业务逻辑集中

**内容策略**:
- 基于用户习惯名称和计划内容
- 包含激励性语言
- 支持多语言（中文为主）

## Risks / Trade-offs

### 风险 1: 电池消耗
**风险**: 频繁的通知调度可能影响电池寿命
**缓解**: 
- 合理设置通知频率
- 使用系统级调度优化
- 提供用户配置选项

### 风险 2: 权限拒绝
**风险**: 用户可能拒绝通知权限
**缓解**:
- 清晰说明通知价值
- 提供优雅降级方案
- 允许稍后启用

### 风险 3: 平台差异
**风险**: iOS 和 Android 通知行为差异
**缓解**:
- 使用 Expo 统一 API
- 平台特定测试
- 文档说明差异

### 风险 4: 数据迁移
**风险**: 现有用户需要迁移通知配置
**缓解**:
- 提供默认配置
- 渐进式迁移
- 用户确认流程

## Migration Plan

### 阶段 1: 基础设施 (Week 1)
1. 添加 expo-notifications 依赖
2. 创建 PocketBase migration
3. 实现基础通知服务

### 阶段 2: 核心功能 (Week 2)
1. 实现通知调度逻辑
2. 添加权限管理
3. 创建通知配置 UI

### 阶段 3: 集成测试 (Week 3)
1. 集成到计划和习惯模块
2. 跨平台测试
3. 性能优化

### 阶段 4: 发布 (Week 4)
1. 用户测试
2. 文档更新
3. 渐进式发布

### 回滚策略
- 功能开关控制
- 数据库 migration 可逆
- 渐进式发布便于回滚

## Open Questions

1. **通知频率限制**: 是否需要限制每日通知数量？
2. **静默时段**: 是否需要实现夜间免打扰？
3. **通知声音**: 是否支持自定义通知声音？
4. **通知图标**: 是否需要自定义通知图标？
5. **通知历史保留**: 通知历史保留多长时间？
