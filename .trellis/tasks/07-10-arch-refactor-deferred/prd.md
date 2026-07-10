# 架构重构 — CheckinSlice拆分/Settings统一/错误状态

## 背景
Section 2-6 架构深度分析识别出 3 个需要更大重构的改进点。

## M1: CheckinSlice 职责拆分
**现状**：CheckinSlice 同时管理签到、运动、冥想、断食 4 个完全不同的领域。
**方案**：拆分为独立切片，保持向后兼容。
- ExerciseSlice → 运动相关状态
- MeditationSlice → 冥想相关状态  
- FastingSlice → 断食相关状态
- CheckinSlice 只保留签到逻辑

**约束**：需更新 FullStore 类型和 useAppStore 组合。

## M2: Settings 双写路径统一
**现状**：Settings 同时写入 `app_state` 表和 `profile` 实体，启动时需要特殊冲突解决。
**方案**：统一为单一数据源，以 profile 实体为 primary。

## M3: 切片错误状态缺失
**现状**：除 AuthSlice 外，20+ 切片无加载/错误状态。
**方案**：为关键切片添加轻量级错误通知机制。

## 验收标准
- [ ] `pnpm --filter @egoless-do/core test` — 608 测试通过
- [ ] `cd apps/mobile && npx tsc --noEmit` — 无新增类型错误
- [ ] 重构不改变现有 API 行为