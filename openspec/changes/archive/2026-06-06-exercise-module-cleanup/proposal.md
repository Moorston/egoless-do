## Why

运动模块经过多轮迭代，积累了大量重复代码、硬编码字符串、占位数据和架构异味。当前 22 个可优化点影响维护效率、国际化完整性和用户体验。需要系统性清理。

## What Changes

### 代码去重
- `formatPace` 函数在 mobile 4 处 + web 4 处重复 → 移到 `packages/core`
- `useAmapComponents` hook 在 2 处重复 → 提取为共享 hook
- GPS 辅助函数内联在 SportPage → 提取为 `useExerciseGps` hook
- `StrengthActive` 和 `IntervalActive` 93% 相同 → 合并为一个参数化组件
- 删除未使用的 `SoundPicker.tsx` 共享组件

### i18n 补全
- RestOverlay、PrepPage、EnduranceActive、PausedPage、StrengthActive 中 30+ 处硬编码中文改为 `T()` 调用

### 架构优化
- GPS 运动页从 SportPage.tsx 内联代码抽取为独立布局组件 `GpsActive.tsx`
- 40+ props 逐层传递 → 组合为 `exerciseState` 对象减少 prop drilling

### 数据真实性
- EnduranceActive 中爬升/层数/心率占位数据移除或标注为"暂不支持"

**影响平台**: mobile（主要）+ web（formatPace 去重）

**非目标**:
- 不新增功能（运动编辑、模板、导出等留到独立变更）
- 不重构 web 端架构（web 端 hooks 拆分是独立工作）
- 不引入 Context Provider（改动太大，先用组合对象缓解）

## Capabilities

### New Capabilities
- `exercise-code-dedup`: 代码去重——共享工具函数、hook 提取、组件合并
- `exercise-i18n-complete`: i18n 补全——硬编码中文字符串国际化

### Modified Capabilities
（无）

## Impact

- `packages/core/src/` — 新增 `formatPace` 工具函数
- `apps/mobile/src/features/exercise/` — hooks、layouts、pages、shared 多文件重构
- `apps/web/src/` — `formatPace` 引用改为从 core 导入
