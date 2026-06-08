## Why

当前 `SportPage.tsx` 将所有运动类型的 active 阶段渲染逻辑放在同一个组件中，通过 `sportType === 'repetition' ? ... : ...` 条件分支处理不同布局。随着运动体验分类从 2 种扩展到 4 种（meditative/endurance/strength/interval），条件分支急剧膨胀，文件已超过 1200 行，可维护性差。

不同运动类型的用户角色本质不同：冥想型是"跟随者"、耐力型是"观察者"、力量型是"操作者"、间歇型是"操作者+观察者"。统一布局无法同时满足这些差异化的交互需求。需要按运动体验类型拆分为独立布局组件，每种类型有自己的信息架构和交互模式。

## What Changes

- **拆分 SportPage.tsx**：将 1200+ 行的单文件拆分为路由层 + 4 个独立布局组件
- **4 种布局组件**：
  - `MeditativeActive`：沉浸式呼吸引导，无 +/- 按钮，底栏仅暂停+设置
  - `EnduranceActive`：Keep 风格数据仪表盘（1+2+2 网格），底栏 3 按钮（停止/继续/设置）
  - `StrengthActive`：次数操作台，主数字+组历史+进度条，底栏时长+暂停+热量
  - `IntervalActive`：操作台+嵌入式休息条，底栏同力量型
- **提取 hooks**：计时器、音效、休息、组管理、目标逻辑提取到独立 hook 文件
- **拆分共享组件**：顶栏、底栏、休息 overlay、音效选择器、庆祝动画等独立组件
- **底栏统一为 3 按钮**：停止（红）、继续（绿）、设置（灰），移除锁定按钮
- **三区布局一致性**：所有状态（prep/countdown/active/paused）底栏固定在底部，状态切换无视觉跳跃，暂停页不再使用 justifyContent: center 将按钮推到屏幕中央
- **缺失数据源显示为 0**：耐力型的层数/圈数/心率等无数据源字段显示 "0" 或 "--"

## Capabilities

### New Capabilities
- `sport-active-layouts`: 4 种运动体验类型的独立 active 页面布局组件及其切换逻辑

### Modified Capabilities
- `sport-active-page`: 运动中页面的布局从单组件改为按体验类型分发的多布局架构

## Impact

- **平台**: Mobile only (`apps/mobile`)
- **核心文件**: `apps/mobile/src/features/exercise/SportPage.tsx` — 从单文件拆分为多文件
- **无破坏性变更**: 用户可见行为不变（相同布局、相同交互），仅代码组织方式改变
- **依赖**: 无新增依赖，使用已有的 expo-audio、expo-haptics、react-native-svg
