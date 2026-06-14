## 1. 类型与常量

- [x] 1.1 `packages/core/src/types/plan.ts` — PlanItemLink 类型新增 `'trail'`
- [x] 1.2 `packages/core/src/constants.ts` — LINK_COLORS 新增 `trail: '#8B5CF6'`

## 2. 业务逻辑

- [x] 2.1 `packages/core/src/business/plan.ts` — createPlanItem 中 trail 来源设 `link: 'trail'`

## 3. i18n

- [x] 3.1 `packages/core/src/i18n/zh.ts` — 新增 `planLinkTrail:'脉络'`
- [x] 3.2 `packages/core/src/i18n/zh-Hant.ts` — 新增 `planLinkTrail:'脈絡'`
- [x] 3.3 `packages/core/src/i18n/en.ts` — 新增 `planLinkTrail:'Trail'`
- [x] 3.4 `packages/core/src/i18n/types.ts` — 新增 `planLinkTrail: string`

## 4. 计划详情页

- [x] 4.1 `apps/mobile/src/features/plan/PlanDetailContent.tsx` — relatedTrails 优先通过 item.trailId 直接查找关联脉络
