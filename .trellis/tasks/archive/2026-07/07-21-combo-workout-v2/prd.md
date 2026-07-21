# PRD: 组合锻炼功能深度优化

## Goal

修复组合锻炼功能（combo workout）当前存在的所有问题，提升完整性、国际化支持和用户体验。

## Background

组合锻炼功能已实现核心流程：多动作顺序执行、过渡页、进度条、聚合保存。经过深度代码审查，发现 **12 个待修复问题**，涵盖硬编码、国际化、类型安全、导航和 UI 布局。

## 问题清单（按优先级）

### 🔴 P0 — 功能阻断

| # | 问题 | 文件:行 | 修复 |
|---|------|---------|------|
| P0-1 | 导航报错：`nav.navigate('Body')` 无法解析 | SportPage.tsx:402,471 | 改为 `nav.navigate('MainTabs', { screen: 'Body', params: result })` |

### 🟡 P1 — 硬编码中文（国际化）

| # | 问题 | 文件:行 | 修复 |
|---|------|---------|------|
| P1-1 | ComboProgressHeader 名称用 `nameZh` | ComboProgressHeader.tsx:62,97 | `ex.nameI18nKey ? T(ex.nameI18nKey) : ex.nameZh` |
| P1-2 | TransitionScreen 名称用 `nameZh` | TransitionScreen.tsx:67,120 | 同上 |
| P1-3 | TransitionScreen 8 个 i18n key 不存在 | TransitionScreen.tsx:61,79,97,99,105,114,136 | 新增 i18n key + 三语言翻译 |
| P1-4 | PrepPage 传 raw key 非翻译名称 | SportPage.tsx:519 | 传 `effectiveSportLabel` |
| P1-5 | `exerciseAddMusic` i18n key 不存在 | PrepPage.tsx:54 | 新增 i18n key + 翻译 |
| P1-6 | `bodyJumpTo` i18n key 不存在 | ComboProgressHeader.tsx:104 | 新增 i18n key + 翻译 |

### 🟢 P2 — UI/类型/体验

| # | 问题 | 文件:行 | 修复 |
|---|------|---------|------|
| P2-1 | Transition 页缺 `safeAreaTop` | SportPage.tsx:636-655 | 补 `safeAreaTop={insets.top}` |
| P2-2 | BodyScreen `sportResult` 类型缺 `isCombo`/`exercises` | BodyScreen.tsx:23 | 扩展类型 |
| P2-3 | BodyFlow 完成后无组合汇总 | BodyFlow.tsx | 展示各动作时长/热量 |
| P2-4 | GPS 组合模式被禁用 | SportPage.tsx:85 | 按需启停 GPS |

## Requirements

### R1: 修复导航（P0-1）
- `handleSaveAll` 和 `handleSave` 中的 `nav.navigate('Body', result)` 改为嵌套导航

### R2: 国际化修复（P1-1 ~ P1-6）
- 所有 `nameZh` 改为 `nameI18nKey ? T(nameI18nKey) : nameZh`
- 新增 10 个 i18n key 到 types.ts + zh/en/zh-Hant

### R3: UI 布局修复（P2-1）
- Transition 页面补 `safeAreaTop`

### R4: 类型扩展（P2-2）
- BodyScreen `sportResult` 类型增加可选字段

### R5: 组合汇总展示（P2-3）
- BodyFlow practice 完成卡片中展示组合明细

### R6: GPS 按需启停（P2-4）
- 组合模式中根据当前动作类型决定是否启用 GPS

## Out of Scope

- 超级组（superset）模式
- 自定义组合编辑器
- 组合训练模板保存

## Acceptance Criteria

- [ ] AC1: 组合锻炼完成后正确导航回 Body，无报错
- [ ] AC2: 所有动作名称在英文界面正确显示（传统功法翻译，力量动作回退中文）
- [ ] AC3: 所有新增 i18n key 在 zh/en/zh-Hant 中均有翻译
- [ ] AC4: Transition 页面进度条在刘海屏下不被遮挡
- [ ] AC5: BodyScreen sportResult 类型包含 combo 字段
- [ ] AC6: BodyFlow practice 完成后展示组合汇总明细
- [ ] AC7: 含 GPS 运动的组合能正确启停定位

## Design Notes

### 国际化名称显示策略
```typescript
// 统一 helper
const getExerciseName = (ex: ExerciseDef, T: (k: string) => string) =>
  ex.nameI18nKey ? T(ex.nameI18nKey) : ex.nameZh;
```

### 新增 i18n keys
```
bodyExerciseComplete   动作完成！ / Exercise Complete! / 動作完成！
bodyRestCountdown      休息中 / Resting / 休息中
bodySkipRest           跳过休息 / Skip Rest / 跳過休息
bodyAllDone            全部完成！ / All Done! / 全部完成！
bodyComboCompleteHint  所有动作已完成 / All exercises completed / 所有動作已完成
bodyFinish             完成 / Finish / 完成
bodyNextExercise       下一动作 / Next Exercise / 下一動作
bodyStartNext          开始下一个 / Start Next / 開始下一個
bodyJumpTo             跳转 / Jump / 跳轉
exerciseAddMusic       添加音乐 / Add Music / 添加音樂
```

### 导航修复
```typescript
// Before
nav.navigate('Body', result);

// After
nav.navigate('MainTabs' as never, { screen: 'Body', params: result } as never);
```

### 组合汇总展示
BodyFlow practice 步骤完成卡片中，检测到 `isCombo` 时展示：
- 动作数量（如 "3 个动作"）
- 各动作名称 + 时长小计
- 总热量

## Open Questions

（无阻塞性问题）