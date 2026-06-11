# Modal Keyboard Avoidance

## Requirement

所有含输入框的 Mobile 模态框在键盘弹出时，输入框必须完全可见，不被键盘遮挡。

## Affected Modals

| 模态框 | 文件 | 当前状态 |
|--------|------|----------|
| 新建感念 | ReflectionsScreen.tsx | 有 KAV，缺 offset |
| 编辑感念 | ReflectionsScreen.tsx | 有 KAV，缺 offset |
| 添加/编辑习惯 | HabitsScreen.tsx | 有 KAV，缺 offset |
| 创建计划任务 | ReflectionsScreen.tsx | 无 KAV |
| 状态变更原因 | HabitsScreen.tsx | 无 KAV |
| 创建思维脉络 | CreateThoughtTrailModal.tsx | 无 KAV |

## Behavior

- 键盘弹出时，模态框内容自动上推
- 聚焦的输入框始终在键盘上方可见
- iOS 和 Android 表现一致
- 多输入框场景下，点击其他输入框不收起键盘
