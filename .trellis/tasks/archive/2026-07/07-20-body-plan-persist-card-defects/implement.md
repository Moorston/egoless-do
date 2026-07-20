# Implement: 调身计划持久化与卡片功能缺陷

## 执行顺序

### Phase A：持久化修复（子1）— 前提

1. **rowMappers.ts**：追加 `rowToBodyTrainingPlan`
   - 参考 `rowToBodyPlan` 的写法
   - 使用 `mappers.bodyTrainingPlan`（由 entitySchemas 自动生成）

2. **SyncRehydrationManager.ts**：
   - import 行追加 `rowToBodyTrainingPlan`
   - REHYDRATE_MAP 在 `bodyCheckin` 后追加 `bodyTrainingPlan` 条目

3. **验证**：确认 persist + rehydrate 链路打通

### Phase B：卡片按钮（子2）— 依赖 Phase A

4. **PlanDetailModal.tsx**（新建）：
   - 只读展示计划详情
   - 接收 props: visible, plan, TH, T, onClose

5. **PlanManagementScreen.tsx**：
   - 重构 action 按钮区：编辑 + 详情 + 删除（+ 暂停/激活）
   - 引入 PlanDetailModal
   - 编辑按钮对所有计划显示

6. **i18n**：追加 4 文件新 key

### Phase C：验证

7. `npx eslint` 修改文件
8. `npx tsc --noEmit -p packages/core/tsconfig.json`
9. 功能验证：创建计划 → 重启 → 仍存在；点详情 → 弹窗展示正确

## 回滚点
- Phase A 独立可回滚（仅加 mapper + rehydrate 条目）
- Phase B 独立可回滚（仅 UI 改动）

## 关键文件路径
- `apps/mobile/src/store/rowMappers.ts`
- `apps/mobile/src/features/sync/SyncRehydrationManager.ts`
- `apps/mobile/src/features/practice/body/screens/PlanManagementScreen.tsx`
- `apps/mobile/src/features/practice/body/modals/PlanDetailModal.tsx`（新建）
- `packages/core/src/i18n/{types,zh,en,zh-Hant}.ts`
