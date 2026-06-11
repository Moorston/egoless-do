## Approach

简单直接的修复，无需架构变更。

### 1. 文案修改

在 `packages/core/src/i18n/zh.ts`、`zh-Hant.ts`、`en.ts` 中将 `createThoughtTrail` 的值更新：
- zh: `'新建思路脉络'` → `'新建思路链'`
- zh-Hant: `'新建思路脈絡'` → `'新建思路鏈'`
- en: `'Create Thought Trail'` → `'Create Thought Chain'`

### 2. 选择器模式隐藏 actions

在 `CreateThoughtTrailModal.tsx` 中，用 `{!showSelector && (...)` 条件渲染底部 actions 区域。选择器模式下用户通过"返回"按钮回到表单，再使用确认/取消按钮。
