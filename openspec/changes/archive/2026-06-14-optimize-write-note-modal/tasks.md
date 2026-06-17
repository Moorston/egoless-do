## 1. 内容输入优化

- [x] 1.1 内容输入区 minHeight 从 120px 增加到 200px
- [x] 1.2 实现字数统计（右下角显示「已写 N 字」）

## 2. 标签输入优化

- [x] 2.1 合并标签输入为单 TextInput，回车添加
- [x] 2.2 标签改为 pill 样式（与 ReviewNoteCard 一致）

## 3. 心情选择优化

- [x] 3.1 心情选项改为 emoji + 文字标签
- [x] 3.2 统一使用 Mood 类型（happy, calm, neutral, sad, anxious, grateful）

## 4. 复盘思路展示

- [x] 4.1 新增 reviewPerspectives prop
- [x] 4.2 实现可折叠的复盘思路区块
- [x] 4.3 ThoughtTrailDetailScreen 传入 trail.reviewCache?.perspectives

## 5. 引导问题优化

- [x] 5.1 引导问题改为独立高亮区块，大字加粗

## 6. 草稿保护

- [x] 6.1 关闭弹窗时检查内容，非空弹出确认对话框

## 7. 验证

- [-] 7.1 验证自由反思复盘的完整流程
- [-] 7.2 验证引导式复盘的完整流程
- [-] 7.3 验证草稿保护功能
