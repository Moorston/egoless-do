## ADDED Requirements

### Requirement: 通知权限请求
系统 SHALL 在适当时机请求通知权限。

#### Scenario: 首次创建计划时请求
- **WHEN** 用户首次创建计划或习惯
- **THEN** 系统显示通知权限请求对话框

#### Scenario: 权限请求说明
- **WHEN** 系统请求通知权限
- **THEN** 显示清晰的价值说明，解释通知如何帮助习惯养成

### Requirement: 通知权限状态管理
系统 SHALL 跟踪和管理通知权限状态。

#### Scenario: 记录权限状态
- **WHEN** 用户授予或拒绝通知权限
- **THEN** 系统记录权限状态到本地存储

#### Scenario: 检查权限状态
- **WHEN** 应用需要发送通知时
- **THEN** 系统检查当前权限状态

### Requirement: 通知权限引导
系统 SHALL 为拒绝权限的用户提供引导。

#### Scenario: 权限拒绝后的引导
- **WHEN** 用户拒绝通知权限
- **THEN** 系统显示设置页面引导，说明如何手动启用

#### Scenario: 权限设置页面
- **WHEN** 用户访问通知设置
- **THEN** 显示当前权限状态和启用/禁用选项

### Requirement: 通知权限优雅降级
系统 SHALL 在权限被拒绝时提供降级方案。

#### Scenario: 权限拒绝时的降级
- **WHEN** 通知权限被拒绝
- **THEN** 系统禁用通知功能，但保留其他功能正常运行

#### Scenario: 权限状态变化处理
- **WHEN** 用户在系统设置中更改权限
- **THEN** 系统检测变化并相应调整功能

### Requirement: 通知权限平台适配
系统 SHALL 适配不同平台的权限模型。

#### Scenario: iOS 权限处理
- **WHEN** 在 iOS 上请求权限
- **THEN** 遵循 iOS 通知权限流程

#### Scenario: Android 权限处理
- **WHEN** 在 Android 上请求权限
- **THEN** 遵循 Android 通知权限流程

#### Scenario: Web 权限处理
- **WHEN** 在 Web 上请求权限
- **THEN** 使用浏览器通知 API 权限模型
