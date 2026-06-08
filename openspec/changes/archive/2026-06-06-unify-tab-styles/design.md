## Context

当前思维脉络页面（MindTrailTab.tsx 和 MindTrailScreen.tsx）的 tab 切换器使用透明背景+边框样式，而计划详情页面（PlanDetailContent.tsx）使用实心背景+白字样式。需要统一为计划详情页面的样式。

**当前样式对比：**

| 属性 | 思维脉络页面 | 计划详情页面 |
|------|-------------|-------------|
| 背景 | `${P}20` (透明) | `P` (实心) / `TH.card` |
| 边框 | `1px solid P` | `none` |
| 文字颜色 | `P` (主题色) | `#fff` (白色) |
| 字重 | `600` | `700` |
| 圆角 | `10px` | `12px` |
| 字体 | `FONT_SMALL` | `FONT_BODY` |

## Goals / Non-Goals

**Goals:**
- 统一思维脉络页面的 tab 样式与计划详情页面一致
- 保持两个页面的交互行为不变

**Non-Goals:**
- 不修改计划详情页面的样式
- 不修改 tab 的功能逻辑
- 不涉及 Web 端（仅 Mobile）

## Decisions

**决策 1：直接修改内联样式**

由于 Mobile 端使用 React Native StyleSheet，且 tab 样式相对简单，直接修改内联样式即可，无需抽取共享样式常量。

**决策 2：保持 TouchableOpacity 组件**

思维脉络页面使用 `TouchableOpacity`，计划详情页面使用 `button`（Web）。保持各自平台的原生组件不变，仅统一视觉样式。

## Risks / Trade-offs

**风险**：无明显风险。纯样式变更，不影响功能。

**权衡**：选择实心背景样式（计划详情页面）而非透明背景样式，因为实心背景在视觉上更突出，更适合作为主要导航元素。
