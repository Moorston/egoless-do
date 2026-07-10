# 架构重构 M1-M3: CheckinSlice拆分/Settings统一/错误状态

## 背景
Section 2-6 架构深度分析识别出 3 个需要更大重构的改进点。按风险排序：M3（低）→ M1（中）→ M2（高）。

## M3: 切片错误状态缺失
- 在 `sliceHelper.ts` 中新增 `withErrorHandling` 包装器
- 在 `types.ts` 中新增 `SliceError` 类型
- 为所有切片工厂提供错误通知机制

## M1: CheckinSlice 职责拆分
- 拆分为 `createExerciseSlice.ts`、`createMeditationSlice.ts`、`createFastingSlice.ts`
- `createCheckinSlice.ts` 只保留签到 + 优雅记录
- 更新 `types.ts` 接口定义
- 更新 `useAppStore.ts` 组合

## M2: Settings 双写路径统一
- 统一为 `persistChange('profile', 'self', ...)` 单一路径
- `app_state` 表仅用于非 profile 数据
- 简化 `initApp.ts` 合并逻辑

## 约束
- 遵循项目规范
- 不改变运行时行为

## 验收标准
- [ ] `pnpm --filter @egoless-do/core test` — 608 测试通过
- [ ] 所有新切片正确导出和组合