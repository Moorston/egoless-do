## Why

创建思路脉络时，点击"选择感念"进入选择器模式，但底部的取消/确认按钮仍然显示，导致布局混乱且可能遮挡感念列表，用户无法正常选择感念。同时"新建思路脉络"文案需要更名为"新建思路链"。

## What Changes

- 将翻译 key `createThoughtTrail` 从 `'新建思路脉络'` 改为 `'新建思路链'`（zh / zh-Hant / en 同步更新）
- `CreateThoughtTrailModal` 选择器模式下隐藏底部 actions 按钮，选择完成后返回表单模式再显示

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无 spec 级别的行为变更，仅 UI 修复和文案调整）

## Impact

- `packages/core/src/i18n/zh.ts` — 文案修改
- `packages/core/src/i18n/zh-Hant.ts` — 文案修改
- `packages/core/src/i18n/en.ts` — 文案修改
- `apps/mobile/src/features/reflections/CreateThoughtTrailModal.tsx` — 条件渲染 actions
