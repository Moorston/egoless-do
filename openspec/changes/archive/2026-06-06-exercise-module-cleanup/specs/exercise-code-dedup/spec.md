## ADDED Requirements

### Requirement: formatPace 共享工具函数

系统 SHALL 在 `packages/core` 中提供 `formatPace(secondsPerKm: number): string` 函数，mobile 和 web 两端 MUST 统一引用此函数，不再各自定义。

#### Scenario: formatPace 输出格式
- **WHEN** 输入 300（5 分钟/公里）
- **THEN** 返回 "5'00""

#### Scenario: mobile 端无重复定义
- **WHEN** 搜索 mobile exercise 目录中的 formatPace 定义
- **THEN** 不存在本地定义，全部从 `@egoless-do/core` 导入

#### Scenario: web 端无重复定义
- **WHEN** 搜索 web exercise 目录中的 formatPace 定义
- **THEN** 不存在本地定义，全部从 `@egoless-do/core` 导入

### Requirement: 合并 StrengthActive 和 IntervalActive

系统 SHALL 将 `StrengthActive` 和 `IntervalActive` 合并为一个参数化组件，通过 prop（如 `restMode: 'overlay' | 'inline'`）区分休息展示方式。

#### Scenario: 力量运动使用全屏休息
- **WHEN** restMode 为 'overlay'
- **THEN** 组间休息显示全屏 RestOverlay

#### Scenario: 间歇运动使用内联休息
- **WHEN** restMode 为 'inline'
- **THEN** 组间休息显示 EmbeddedRest 内联条

### Requirement: GPS 运动页抽取为独立组件

系统 SHALL 将 SportPage.tsx 中内联的 GPS 运动页（约 40 行）抽取为 `GpsActive.tsx` 布局组件，与 4 种体验类型布局保持一致的目录结构。

#### Scenario: GPS 运动使用独立组件
- **WHEN** 运动类型为 GPS 且页面为 active
- **THEN** 渲染 `layouts/GpsActive.tsx` 而非 SportPage 内联 JSX

### Requirement: 删除未使用组件

系统 SHALL 删除 `shared/SoundPicker.tsx`，该组件未被任何文件引用。

#### Scenario: 无引用残留
- **WHEN** 删除 SoundPicker.tsx 后编译
- **THEN** 无 TypeScript 错误

### Requirement: 提取 useAmapComponents hook

系统 SHALL 将 `useAmapComponents` 从 SportPage.tsx 和 ExerciseHistoryScreen.tsx 中提取为共享 hook。

#### Scenario: 两处引用统一
- **WHEN** SportPage 和 ExerciseHistoryScreen 需要高德地图组件
- **THEN** 都从同一个共享 hook 导入
