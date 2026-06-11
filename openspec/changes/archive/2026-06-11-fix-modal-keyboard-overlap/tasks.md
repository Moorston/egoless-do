## 1. 缺少 KeyboardAvoidingView 的模态框

- [x] 1.1 创建计划任务模态框（ReflectionsScreen）：包裹 KAV，改为底部弹出布局
- [x] 1.2 状态变更原因模态框（HabitsScreen）：包裹 KAV，改为底部弹出布局
- [x] 1.3 创建思维脉络模态框（CreateThoughtTrailModal）：包裹 KAV，改为底部弹出布局

## 2. 已有 KAV 但配置不完整的模态框

- [x] 2.1 新建/编辑感念模态框（ReflectionsScreen）：ScrollView 添加 `keyboardShouldPersistTaps="handled"`（已有，无需修改）
- [x] 2.2 添加/编辑习惯模态框（HabitsScreen）：ScrollView 添加 `keyboardShouldPersistTaps="handled"`
