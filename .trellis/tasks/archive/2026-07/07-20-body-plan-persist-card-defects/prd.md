# PRD: 调身计划持久化与卡片功能缺陷

## Goal
修复调身计划保存后数据丢失（重启消失），并补齐计划卡片缺失的编辑/详情按钮。

## 问题

### 子1：计划保存后数据丢失
- 用户在 BodyPlanEditorScreen 创建/编辑计划，点保存 → 返回 → 列表页看不到
- 重启 APP 后计划完全消失
- 同步到 PocketBase 服务端也不生效
- **根因**：rehydrate 链路断裂——`SyncRehydrationManager.REHYDRATE_MAP` 无 `bodyTrainingPlan` 条目，且 `rowToBodyTrainingPlan` mapper 函数不存在。数据写入 `body_training_plans` 表后重启无人读回。

### 子2：计划卡片缺少编辑/详情按钮
- PlanManagementScreen 的计划卡片：非 active 计划无编辑按钮、所有计划无详情按钮
- 用户需求：每张卡片都有「编辑 + 详情 + 删除」操作，active 计划额外有暂停/激活切换
- 详情 → 只读预览弹窗（展示日期/策略/动作列表/进度）

## Requirements

### 子1（持久化+同步）
- [ ] 重启 APP 后调身计划数据完整恢复
- [ ] 新建/编辑计划后列表页即时可见
- [ ] 数据正确同步到 PocketBase（body_training_plans 集合）
- [ ] 有 tasks 数组的计划正确保存/恢复

### 子2（卡片按钮）
- [ ] 所有计划卡片显示：编辑 + 详情 + 删除
- [ ] active 计划额外显示暂停切换（现已有）
- [ ] 编辑按钮 → 跳转 BodyPlanEditor 带 planId
- [ ] 详情按钮 → 只读预览 Modal
- [ ] 详情 Modal 展示：名称、日期范围、策略、状态、进度、每天的训练安排
- [ ] 删除按钮保留现有确认逻辑

## Acceptance Criteria

- [ ] 创建计划 → 重启 APP → 计划在 PlanManagementScreen 仍存在
- [ ] 编辑计划 → 保存 → 详情弹窗展示最新数据
- [ ] PB 服务端 body_training_plans 集合有对应记录
- [ ] lint / type-check 无新增错误

## Notes

- 子1 是子2 的前提（编辑/详情依赖数据正确加载）
- i18n：新增 key 需 4 文件同步（types.ts + zh + en + zh-Hant）
- 修复顺序：先子1 → 再子2
