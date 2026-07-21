# Design: 组合锻炼功能深度优化

## Architecture

### 修复概览

```
P0-1 导航修复 ──────────── SportPage.tsx (handleSaveAll, handleSave)
P1-1 名称国际化 ────────── ComboProgressHeader.tsx
P1-2 名称国际化 ────────── TransitionScreen.tsx
P1-3 i18n key 新增 ─────── types.ts + zh.ts + en.ts + zh-Hant.ts
P1-4 PrepPage 名称 ──────── SportPage.tsx
P1-5 exerciseAddMusic ──── types.ts + zh.ts + en.ts + zh-Hant.ts
P1-6 bodyJumpTo ────────── types.ts + zh.ts + en.ts + zh-Hant.ts
P2-1 safeAreaTop ───────── SportPage.tsx (Transition page)
P2-2 sportResult 类型 ──── BodyScreen.tsx
P2-3 组合汇总展示 ──────── BodyFlow.tsx
P2-4 GPS 按需启停 ──────── SportPage.tsx
```

### 国际化名称显示策略

```typescript
// 统一模式：有 i18n key 则翻译，无则回退 nameZh
const getExerciseName = (ex: ExerciseDef, T: (k: string) => string) =>
  ex.nameI18nKey ? T(ex.nameI18nKey) : ex.nameZh;
```

### 新增 i18n Keys

| key | zh | en | zh-Hant |
|-----|----|----|---------|
| bodyExerciseComplete | 动作完成！ | Exercise Complete! | 動作完成！ |
| bodyRestCountdown | 休息中 | Resting | 休息中 |
| bodySkipRest | 跳过休息 | Skip Rest | 跳過休息 |
| bodyAllDone | 全部完成！ | All Done! | 全部完成！ |
| bodyComboCompleteHint | 所有动作已完成 | All exercises completed | 所有動作已完成 |
| bodyFinish | 完成 | Finish | 完成 |
| bodyNextExercise | 下一动作 | Next Exercise | 下一動作 |
| bodyStartNext | 开始下一个 | Start Next | 開始下一個 |
| bodyJumpTo | 跳转 | Jump | 跳轉 |
| exerciseAddMusic | 添加音乐 | Add Music | 添加音樂 |

### 导航修复

```typescript
// Before (broken)
nav.navigate('Body', result);

// After (correct nested navigation)
nav.navigate('MainTabs' as never, { screen: 'Body', params: result } as never);
```

### 组合汇总展示

BodyFlow practice 完成卡片中，当检测到 combo 结果时：
- 展示动作数量
- 列出各动作名称 + 时长
- 展示总热量

### GPS 按需启停

```typescript
// 当前：组合模式禁用 GPS
const effectiveGps = isComboMode ? false : (gpsParam ?? false);

// 修复：根据当前动作类型决定
const currentEx = isComboMode ? comboExercises[comboState.current.currentIndex] : null;
const effectiveGps = isComboMode
  ? (currentEx?.category === 'walking' || currentEx?.category === 'cardio')
  : (gpsParam ?? false);
```

## Files to Modify

| File | Changes |
|------|---------|
| `SportPage.tsx` | P1-4, P2-1, P2-4 |
| `ComboProgressHeader.tsx` | P1-1 |
| `TransitionScreen.tsx` | P1-2 |
| `BodyScreen.tsx` | P2-2 |
| `BodyFlow.tsx` | P2-3 |
| `types.ts` (i18n) | P1-3, P1-5, P1-6 |
| `zh.ts` | P1-3, P1-5, P1-6 |
| `en.ts` | P1-3, P1-5, P1-6 |
| `zh-Hant.ts` | P1-3, P1-5, P1-6 |