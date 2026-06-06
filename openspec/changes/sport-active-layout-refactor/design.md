## Context

当前 `SportPage.tsx` 是一个 1200+ 行的单体组件，通过条件渲染处理所有运动类型的 active 阶段。随着运动体验分类从 2 种（repetition/timed）扩展到 4 种（meditative/endurance/strength/interval），条件分支急剧膨胀。

项目已有资源：
- `getSportExperienceType()` 已实现，返回 `'meditative' | 'endurance' | 'strength' | 'interval'`
- `expo-audio` + 环境音效已在 SportPage 中集成
- `expo-haptics` + `react-native-svg` 已在使用
- `LinearGradient` (expo-linear-gradient) 已在使用

## Goals / Non-Goals

**Goals:**
- 按运动体验类型拆分为 4 个独立布局组件
- 提取共享 hooks 到独立文件
- 拆分共享 UI 组件
- 每种布局有独立的信息架构和交互模式
- 一次性完成重构，不渐进式迁移

**Non-Goals:**
- 不改变用户可见行为（布局、交互保持不变）
- 不新增功能（仅重构代码组织）
- 不修改 packages/core 中的共享逻辑
- 不涉及 GPS 运动页面（GPS 运动保持现有逻辑）

## Decisions

### 1. 布局分发策略

在 SportPage.tsx 路由层，当 `page === 'active'` 时，根据 `experienceType` 分发到不同布局组件：

```
SportPage.tsx (路由层)
├── prep → <PrepPage />
├── countdown → <CountdownPage />
├── paused → <PausedPage />
├── report → <ReportPage />
└── active → switch(experienceType)
    ├── meditative → <MeditativeActive />
    ├── endurance  → <EnduranceActive />
    ├── strength   → <StrengthActive />
    └── interval   → <IntervalActive />
```

每个布局组件完全独立，不共享模板。接受相同的 props 接口（timer state, sets, targets 等）。

### 2. Hooks 提取

从 SportPage.tsx 提取 5 个自定义 hook：

| Hook | 职责 | 依赖 |
|------|------|------|
| `useExerciseTimer` | 计时器启停、暂停恢复、秒表逻辑 | 无 |
| `useExerciseAudio` | 环境音播放、事件音效、音效选择持久化 | expo-audio, AsyncStorage |
| `useExerciseRest` | 休息倒计时、自动跳转下一组 | useExerciseTimer |
| `useExerciseSets` | 组管理、当前组次数、组历史、完成组逻辑 | expo-haptics |
| `useExerciseTargets` | 目标进度、软目标计算、里程碑检测 | useExerciseSets, useExerciseTimer |

所有 hook 接收 route params 和 store 作为参数，返回状态和操作函数。

### 3. 共享组件拆分

| 组件 | 用途 |
|------|------|
| `ExerciseTopBar` | 顶部状态栏（运动名+图标+目标信息+音效按钮） |
| `ExerciseBottomBar` | 底部操作栏（根据布局类型渲染不同按钮组合） |
| `RestOverlay` | 全屏休息 overlay（力量型使用，SVG 环形倒计时） |
| `EmbeddedRest` | 嵌入式休息条（间歇型使用，主区内进度条） |
| `SoundPicker` | 音效选择器（可展开的标签列表） |
| `CelebrationOverlay` | 目标达成庆祝动画 |

### 4. 底栏按钮策略

统一为 3 按钮布局，但根据布局类型有不同的按钮语义：

- **冥想型**: [暂停] [设置] — 2 按钮，极简
- **耐力型**: [停止(红)] [继续(绿)] [设置(灰)] — Keep 风格 3 按钮
- **力量型**: [时长] [暂停] [热量] — 信息+操作混合
- **间歇型**: [时长] [暂停] [热量] — 同力量型

### 5. 耐力型数据展示

采用 Keep 风格 1+2+2 网格布局：

```
         总消耗(主指标)
    总时长        爬升高度
    层数          实时心率
```

缺失数据源（层数、爬升高度、心率）显示为 "0" 或 "--"，UI 框架先就位，未来接入传感器时只需填充数据。

### 6. 文件结构

```
apps/mobile/src/features/exercise/
├── SportPage.tsx              ← 路由层 (~200行)
│
├── hooks/
│   ├── useExerciseTimer.ts
│   ├── useExerciseAudio.ts
│   ├── useExerciseRest.ts
│   ├── useExerciseSets.ts
│   └── useExerciseTargets.ts
│
├── layouts/
│   ├── MeditativeActive.tsx
│   ├── EnduranceActive.tsx
│   ├── StrengthActive.tsx
│   └── IntervalActive.tsx
│
├── shared/
│   ├── ExerciseTopBar.tsx
│   ├── ExerciseBottomBar.tsx
│   ├── RestOverlay.tsx
│   ├── EmbeddedRest.tsx
│   ├── SoundPicker.tsx
│   └── CelebrationOverlay.tsx
│
└── pages/
    ├── PrepPage.tsx
    ├── CountdownPage.tsx
    ├── PausedPage.tsx
    └── ReportPage.tsx
```

## Risks / Trade-offs

- **代码重复** → 4 个独立布局组件之间有部分重复逻辑（如组历史卡片渲染）。接受此代价，因为耦合的维护成本更高。
- **耐力型数据空缺** → 层数/心率等字段显示为 0，短期内用户体验不完整。但 UI 框架就位后，接入数据源只需填充 hook 返回值。
- **一次性重构风险** → 改动面大，可能引入回归。通过保持用户可见行为不变来降低风险。
- **props 传递复杂** → 4 个布局组件需要大量共享状态作为 props。通过自定义 hook 封装状态逻辑，组件只消费 hook 返回值，降低 props 复杂度。
