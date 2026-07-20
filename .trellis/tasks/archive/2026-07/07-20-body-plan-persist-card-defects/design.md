# Design: 调身计划持久化与卡片功能缺陷

## 子1：持久化修复

### 根因
rehydrate 链路断裂。persist 端正确写入 `body_training_plans` 表，但启动时 `SyncRehydrationManager.REHYDRATE_MAP` 无 `bodyTrainingPlan` 条目，且缺少 `rowToBodyTrainingPlan` mapper。

### 修复方案

#### 1. 新增 `rowToBodyTrainingPlan` mapper
**文件**：`apps/mobile/src/store/rowMappers.ts`

参考现有 `rowToBodyPlan`，从 `body_training_plans` 表的行数据还原 `BodyTrainingPlan`：
```typescript
export const rowToBodyTrainingPlan = mappers.bodyTrainingPlan;
```
其中 `mappers.bodyTrainingPlan` 由 `entitySchemas.ts` 的 `buildFromRow` 自动生成（schema 已正确定义）。

#### 2. 注册到 REHYDRATE_MAP
**文件**：`apps/mobile/src/features/sync/SyncRehydrationManager.ts`

在 `bodyCheckin` 条目后追加：
```typescript
bodyTrainingPlan: {
  table: 'body_training_plans',
  query: 'SELECT * FROM body_training_plans WHERE deleted = 0',
  mapper: rowToBodyTrainingPlan,
  storeKey: 'bodyTrainingPlans',
},
```

并在 import 行追加 `rowToBodyTrainingPlan`。

#### 3. 同步到 PocketBase
entitySchemas 已定义 `pocketbase.collection = 'body_training_plans'`，sync push 由 `onSync` 触发。需验证 SyncPush 路径能识别该 entity（entities.ts 已注册 `'bodyTrainingPlan'`）。

### 数据流验证
```
保存: addBodyTrainingPlan → adapter.persistChange → WriteBatcher → body_training_plans 表
                                                        → onSync → SyncEngine → PB
启动: rehydrateFromDb → REHYDRATE_MAP.bodyTrainingPlan → rowToBodyTrainingPlan → store.bodyTrainingPlans
```

## 子2：卡片按钮

### 根因
PlanManagementScreen 的卡片 action 区仅对 active 计划显示编辑，且无详情入口。

### 修复方案

#### 1. 统一按钮布局
每张卡片底部显示：
- **编辑**（所有计划）→ `nav.navigate('BodyPlanEditor', { planId })`
- **详情**（所有计划）→ 打开 PlanDetailModal
- **暂停/激活**（active 显示暂停，非 active 显示激活）
- **删除**（所有计划）→ 现有 Alert 确认

#### 2. PlanDetailModal 组件（新建）
**文件**：`apps/mobile/src/features/practice/body/modals/PlanDetailModal.tsx`

只读展示：
- 计划名称、状态 badge
- 日期范围（startDate ~ endDate）
- 策略（strategy label）
- 进度条
- 每天的训练安排列表（weekday + sportKey + exercises 数量）
- 关闭按钮

Props: `{ visible, plan, TH, T, onClose }`

#### 3. i18n 新增 key
- `bodyPlanEdit` — '编辑'（已存在则复用）
- `bodyPlanDetail` — '详情'
- `bodyPlanDetailTitle` — '计划详情'
- `bodyPlanExercisesCount` — '{} 个动作'
- `bodyPlanNoExercises` — '暂无动作'
- `bodyPlanClose` — '关闭'

## 影响文件

| 文件 | 改动 |
|------|------|
| `rowMappers.ts` | 追加 rowToBodyTrainingPlan |
| `SyncRehydrationManager.ts` | 追加 REHYDRATE_MAP 条目 + import |
| `PlanManagementScreen.tsx` | 按钮布局重构 + 引入 PlanDetailModal |
| `modals/PlanDetailModal.tsx` | 新建只读预览弹窗 |
| `i18n/{types,zh,en,zh-Hant}.ts` | 追加新 key |

## 兼容性
- 现有 `body_training_plans` 表结构不变
- 旧数据（如有）通过 mapper 自动兼容
- PlanManagementScreen 现有功能（激活/暂停/删除）保留
