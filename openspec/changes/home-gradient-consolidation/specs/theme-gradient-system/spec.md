## ADDED Requirements

### Requirement: 主题主渐变定义
系统 SHALL 为每个主题定义一对渐变色（`THEME_GRADIENTS`），从 `theme.primary` 派生，色相不变，只变明度。

#### Scenario: cosmos 主题渐变
- **WHEN** 当前主题为 cosmos（primary #8B5CF6）
- **THEN** `THEME_GRADIENTS.cosmos` 为 `['#8B5CF6', '#6D28D9']`

#### Scenario: ocean 主题渐变
- **WHEN** 当前主题为 ocean（primary #0EA5E9）
- **THEN** `THEME_GRADIENTS.ocean` 为 `['#0EA5E9', '#0369A1']`

#### Scenario: 所有主题都有渐变定义
- **WHEN** 遍历所有主题（cosmos, dark, light, ocean, rose）
- **THEN** 每个主题都有对应的渐变色对

### Requirement: 状态色渐变定义
系统 SHALL 定义 3 种状态色渐变（`STATUS_GRADIENTS`），同色系深浅过渡，色相不变。

#### Scenario: SUCCESS 状态渐变
- **WHEN** 需要表示成功/完成状态
- **THEN** `STATUS_GRADIENTS.SUCCESS` 为 `['#10B981', '#059669']`

#### Scenario: WARNING 状态渐变
- **WHEN** 需要表示警告/宽限期状态
- **THEN** `STATUS_GRADIENTS.WARNING` 为 `['#F59E0B', '#D97706']`

#### Scenario: ERROR 状态渐变
- **WHEN** 需要表示错误/未完成状态
- **THEN** `STATUS_GRADIENTS.ERROR` 为 `['#EF4444', '#DC2626']`

### Requirement: Stats 渐变派生
系统 SHALL 提供 `deriveStatsGradients` 函数，从主题渐变派生 4 组 Stats 卡片渐变。

#### Scenario: 派生 Stats 渐变
- **WHEN** 调用 `deriveStatsGradients(['#8B5CF6', '#6D28D9'])`
- **THEN** 返回 4 组渐变，透明度从 10% 递增到 25%

#### Scenario: Stats 渐变保持色系一致
- **WHEN** 使用派生的 Stats 渐变
- **THEN** 所有 4 组渐变都从同一色系派生，色相不变

### Requirement: Banner 使用主题渐变
Banner 组件 SHALL 使用 `THEME_GRADIENTS` 作为底色渐变。

#### Scenario: 未打卡 Banner
- **WHEN** 用户未打卡
- **THEN** Banner 使用 `THEME_GRADIENTS[theme]` 渐变

#### Scenario: 已完成 Banner
- **WHEN** 用户已完成打卡
- **THEN** Banner 使用 `THEME_GRADIENTS[theme]` 渐变

### Requirement: Banner 状态使用状态色渐变
Banner 状态指示 SHALL 使用 `STATUS_GRADIENTS` 渐变。

#### Scenario: 已打卡未完成状态
- **WHEN** Banner 状态为 notDone
- **THEN** Banner 使用 `STATUS_GRADIENTS.WARNING` 渐变

### Requirement: Grace 提醒使用状态色渐变
Grace 提醒 SHALL 使用 `STATUS_GRADIENTS.WARNING` 渐变。

#### Scenario: Grace 提醒显示
- **WHEN** 显示宽限期提醒
- **THEN** 使用 `STATUS_GRADIENTS.WARNING` 渐变

### Requirement: Stats 卡片使用派生渐变
Stats 卡片 SHALL 使用 `deriveStatsGradients` 派生的渐变。

#### Scenario: Stats 卡片渲染
- **WHEN** 渲染 Stats 网格
- **THEN** 每张卡片使用派生渐变中对应的一组

### Requirement: 进度条使用主题纯色
进度条 SHALL 使用 `theme.primary` 纯色，不使用渐变。

#### Scenario: 饮水进度条
- **WHEN** 渲染饮水进度条
- **THEN** 使用 `theme.primary` 纯色

#### Scenario: 卡路里进度条
- **WHEN** 渲染卡路里进度条
- **THEN** 使用 `theme.primary` 纯色
