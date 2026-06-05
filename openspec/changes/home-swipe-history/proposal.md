## Why

首页目前只能查看当天打卡状态，用户无法快速回溯过去某天的打卡情况。添加左右滑动手势让用户可以逐日浏览历史打卡记录，形成连续的时间线体验，帮助回顾自己的坚持轨迹。

## What Changes

- 在 Mobile 端首页添加全屏左右滑动手势（PanGestureHandler），左滑查看前一天，右滑查看后一天
- 添加顶部日期条，显示当前查看日期，支持左右箭头导航和快捷"今天"回跳按钮
- 历史日期进入只读模式：所有交互组件 disabled，不显示提交按钮和编辑入口
- 历史数据从 checkinHistory 的 note JSON 中恢复（practices、habits、food、water、note），实时步数显示"--"
- 右下角浮动气泡在滚动超过 Banner 后淡入，作为辅助回跳入口
- 仅 Mobile 端实现，Web 端不实现

**非目标**：
- 不支持历史日期的编辑或补打卡（只读）
- 不支持跨月快速跳转（仅逐日滑动）
- 不修改 Web 端 HomeTab

## Capabilities

### New Capabilities
- `home-date-navigation`: 首页日期导航系统，包括滑动手势、日期条 UI、只读模式和历史数据恢复

### Modified Capabilities

## Impact

- **代码**：`apps/mobile/src/features/home/HomeScreen.tsx` — 核心改动，约 20 处 `today` 引用需参数化为 `viewDate`
- **依赖**：`react-native-gesture-handler`（已安装 ~2.28.0）、`react-native-reanimated`（已安装 ~4.1.1）
- **状态管理**：Zustand store 无需改动，数据均从已有 state 派生
- **i18n**：需添加日期条相关翻译 key（如"今天"、星期几等）
