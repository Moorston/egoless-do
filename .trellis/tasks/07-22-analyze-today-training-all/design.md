# 今日训练流程修复方案

## 问题清单

### P0 — 流程断裂

| # | 问题 | 影响 | 文件 |
|---|------|------|------|
| 1 | **BreathingScreen 不写 flowState** | 调息完成后 BodyFlow 无法检测完成状态，步骤 2 永远卡住 | `BreathingScreen.tsx`, `BreathingEngine.tsx` |

### P1 — 代码质量

| # | 问题 | 影响 | 文件 |
|---|------|------|------|
| 2 | **SportPage 818 行** | 文件过大，难以维护和扩展 | `SportPage.tsx` |

### P2 — UI 优化

| # | 问题 | 影响 | 文件 |
|---|------|------|------|
| 3 | **TransitionScreen 安全区域** | ✅ 已修复（paddingTop + 背景色） | `TransitionScreen.tsx` |

---

## 修复方案

### P0-1: BreathingScreen 写入 flowState

**问题**：BreathingScreen 完成后只调用 `goBack()`，不设置 `flowState.breathingCompleted`。BodyFlow 的 breathing 步骤永远显示"未完成"状态，无法进入 checkin 步骤。

**方案**：在 BreathingScreen 保存时，通过 `setBodyFlowState({ breathingCompleted: true, breathingDurationMs })` 写入 flowState。

**具体修改**：

**BreathingEngine.tsx**（`handleSave` 或 report 页的保存回调）：
```typescript
// 在保存呼吸记录后，写入 flowState
const { setBodyFlowState } = useShallowStore(s => ({ setBodyFlowState: s.setBodyFlowState }));
setBodyFlowState({ breathingCompleted: true, breathingDurationMs: totalMs });
```

**BreathingScreen.tsx**：
- 确保 `useFocusEffect` 或 `goBack` 前读取 BreathingEngine 的结果
- 或将 `setBodyFlowState` 传递给 BreathingEngine，在 engine 完成时调用

**数据流**：
```
BreathingEngine 完成 → setBodyFlowState({ breathingCompleted, breathingDurationMs })
  → adapter.persistSettings('bodyFlowState', state) → SQLite
  → goBack() → BodyScreen 重新渲染
  → BodyFlow 从 flowState 读取 breathingCompleted = true
  → 显示「调息已完成」状态
  → 用户可点击「进入觉知」
```

### P1-2: SportPage 拆分

**问题**：SportPage 818 行，包含状态管理、页面路由、GPS 跟踪、呼吸引导、实时会话等逻辑。

**方案**：提取组合模式相关逻辑到独立 hooks / 组件。

**建议拆分**：
1. `useComboState.ts` — 提取 comboState ref、currentIndex、results、goToNextExercise、handleSaveAll
2. `useComboValidation.ts` — 提取 validateCurrentExercise、getRestSec
3. ComboReportPage 已独立，无需再拆

### P2-3: TransitionScreen 安全区域

✅ 已修复：添加 `paddingTop: insets.top` 和 `backgroundColor: TH.bg`。

## 实施优先级

1. **P0-1**: BreathingScreen 写入 flowState — 阻塞性 bug，必须先修复
2. **P1-2**: SportPage 拆分 — 后续重构
3. **P2-3**: 已完成

## 验证方法

- P0-1 修复后：进入 BodyFlow → 完成调息 → 返回 → BodyFlow 显示「调息已完成」→ 可进入觉知步骤
- 测试：`pnpm run type-check`