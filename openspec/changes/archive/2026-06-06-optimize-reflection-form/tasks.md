## 1. 修复 PillSelector 组件布局

- [x] 1.1 修改 `apps/mobile/src/components/UI.tsx` 的 PillSelector 组件，添加 `alignSelf: 'flex-start'`
- [x] 1.2 验证 FilterDrawer 中的横向滚动不受影响

## 2. 创建 ReflectionForm 共享组件

- [x] 2.1 创建 `apps/mobile/src/features/reflections/ReflectionForm.tsx`
- [x] 2.2 实现颜色选择器
- [x] 2.3 实现内容输入（带字数统计）
- [x] 2.4 实现标签选择 + 管理按钮
- [x] 2.5 实现心情选择 + 管理按钮
- [x] 2.6 实现保存按钮

## 3. 重构 ReflectionsScreen 使用新组件

- [x] 3.1 修改 `apps/mobile/src/features/reflections/ReflectionsScreen.tsx` 的新建感念 modal 使用 ReflectionForm
- [x] 3.2 修改编辑感念 modal 使用 ReflectionForm
- [x] 3.3 删除重复代码

## 4. 验证和测试

- [x] 4.1 验证标签管理按钮位置正确（紧跟标签尾部）
- [x] 4.2 验证心情管理按钮样式与标签管理按钮一致
- [x] 4.3 验证新建感念功能正常
- [x] 4.4 验证编辑感念功能正常
- [x] 4.5 验证 FilterDrawer 横向滚动正常
