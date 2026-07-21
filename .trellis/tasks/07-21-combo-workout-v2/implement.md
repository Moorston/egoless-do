# Implementation: 组合锻炼功能深度优化

## Step 1: 新增 i18n keys

**File**: `packages/core/src/i18n/types.ts`
- 在 exercise 区域新增 10 个 key

**File**: `packages/core/src/i18n/zh.ts`
- 新增 10 个中文翻译

**File**: `packages/core/src/i18n/en.ts`
- 新增 10 个英文翻译

**File**: `packages/core/src/i18n/zh-Hant.ts`
- 新增 10 个繁体中文翻译

## Step 2: 修复名称国际化

**File**: `apps/mobile/src/features/exercise/components/ComboProgressHeader.tsx`
- Line 62: `{currentExercise?.nameZh || ...}` → `{currentExercise?.nameI18nKey ? T(currentExercise.nameI18nKey) : currentExercise?.nameZh}`
- Line 97: `{ex.icon} {ex.nameZh}` → `{ex.icon} {ex.nameI18nKey ? T(ex.nameI18nKey) : ex.nameZh}`

**File**: `apps/mobile/src/features/exercise/components/TransitionScreen.tsx`
- Line 67: `{currentExercise.nameZh}` → `{currentExercise.nameI18nKey ? T(currentExercise.nameI18nKey) : currentExercise.nameZh}`
- Line 120: `{nextExercise.nameZh}` → `{nextExercise.nameI18nKey ? T(nextExercise.nameI18nKey) : nextExercise.nameZh}`

## Step 3: 修复 PrepPage 名称传递

**File**: `apps/mobile/src/features/exercise/SportPage.tsx`
- Line 519: `sportName={effectiveSportName}` → `sportName={effectiveSportLabel}`

## Step 4: 修复 Transition 页面 safeAreaTop

**File**: `apps/mobile/src/features/exercise/SportPage.tsx`
- Transition page ComboProgressHeader 补 `safeAreaTop={insets.top}`

## Step 5: 扩展 BodyScreen sportResult 类型

**File**: `apps/mobile/src/features/practice/BodyScreen.tsx`
- Line 23: 扩展类型增加 `isCombo?: boolean; exercises?: [...]`

## Step 6: 组合汇总展示

**File**: `apps/mobile/src/features/practice/body/BodyFlow.tsx`
- practice 完成卡片中检测 combo 结果并展示汇总

## Step 7: GPS 按需启停

**File**: `apps/mobile/src/features/exercise/SportPage.tsx`
- Line 85: 根据当前动作类型决定是否启用 GPS

## Validation

```bash
pnpm run type-check
```