# 优化发愿新增/编辑页

## Goal

提升发愿（Dedication）新增/编辑页面的用户体验和代码质量，补齐编辑功能缺失，改善表单交互和代码结构。

## 已确认的事实（代码库探索）

### 现状
- `DedicationWriteScreen.tsx` (358 行) — 纯新增页面，**无编辑功能**
- Store 中只有 `addDedication` / `removeDedication`，**无 `updateDedication`**
- `DedicationTab.tsx` 展示 Dedication 列表，每张 `DedicationCard` 仅有展开查看，**无编辑入口**
- 表单内容：`insight`(感悟) + `adjustment`(调整) 两个文本输入框，无验证、无字符计数、无草稿保存
- 自动汇总数据（practiceDays、habitStats、planProgress、visionProgress）来自 `useVowProgress()`
- 保存后仅有 `Alert.alert` 无 toast 反馈，且无防重复提交
- 页面使用 `StyleSheet.create` 集中管理样式，但 `DedicationTab` 存在大量内联样式
- `VowScreen.tsx` (351 行) 有独立的 Vision CRUD 功能（通过 Modal 新增/编辑），与 Dedication 是不同功能

### 数据结构
```typescript
interface Dedication extends Syncable {
  id: string; date: string; periodLabel: string;
  type: DedicationType; practiceDays: number; totalDays: number;
  habitStats: HabitStat[]; planProgress?: PlanProgress[];
  visionProgress?: VisionProgress[]; insight?: string; adjustment?: string;
}
```

## Requirements

### 功能性
1. **新增编辑页合一**：DedicationTab 中的 DedicationCard 支持点击编辑，复用当前 DedicationWriteScreen 作为编辑模式
2. **Store 支持更新**：添加 `updateDedication` action
3. **表单基础验证**：insight / adjustment 的字符计数显示，非空内容提示
4. **防重复提交**：保存按钮在提交中禁用

### 非功能性
5. **代码拆分**：将 DedicationWriteScreen 按职责拆分（表单组件、汇总卡片组件）
6. **内联样式迁移**：DedicationTab 中的内联样式提取到 StyleSheet
7. **加载/空态**：DedicationTab 列表已有空态，可保持；编辑页加载时应有 loading 指示

## Acceptance Criteria

- [ ] DedicationCard 点击后进入编辑模式，预填已有数据
- [ ] `updateDedication` action 在 store 中可用，调用后持久化并触发同步
- [ ] 保存按钮在提交中 disable，防止重复提交
- [ ] insight / adjustment 输入框显示字符计数（如 "120/1000"）
- [ ] DedicationTab 的内联样式迁移到 StyleSheet
- [ ] 编辑器可用文本输入区域无明显性能问题

## Out of Scope
- Vision 相关的编辑（已在 VowScreen 中通过 Modal 实现，不在此任务中）
- 发愿设置（DedicationSettingsModal 已独立工作）
- 多语言翻译新增（如果已有键值可用，不新增）

## Open Questions
- 编辑时是否允许修改 auto-summary 数据（practiceDays/habitStats），还是只允许修改 insight/adjustment？