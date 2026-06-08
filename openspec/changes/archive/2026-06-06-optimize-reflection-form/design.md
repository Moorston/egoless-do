## Context

当前新建/编辑感念页面存在以下问题：

1. **布局问题**: PillSelector 组件返回的 View 会占满整行宽度，导致管理按钮被挤到下一行
2. **代码重复**: 新建和编辑 modal 有 ~80 行重复代码（颜色选择器、内容输入、标签选择、心情选择）
3. **视觉一致性**: 由于布局问题，心情管理按钮与标签管理按钮在视觉上位置不一致

**当前代码结构**:
```
ReflectionsScreen.tsx
├── 新建感念 Modal (第496-570行)
│   ├── 颜色选择器
│   ├── 内容输入
│   ├── 标签选择 + 管理按钮
│   ├── 心情选择 + 管理按钮
│   └── 保存按钮
└── 编辑感念 Modal (第949-1023行)
    ├── 颜色选择器
    ├── 内容输入
    ├── 标签选择 + 管理按钮
    ├── 心情选择 + 管理按钮
    └── 保存按钮
```

## Goals / Non-Goals

**Goals:**
- 修复标签管理按钮位置问题
- 消除新建/编辑 modal 的代码重复
- 确保标签和心情管理按钮视觉一致

**Non-Goals:**
- 不修改 Web 端
- 不改变现有功能逻辑
- 不修改 FilterDrawer 中的 PillSelector 使用方式

## Decisions

**决策 1: 修改 PillSelector 组件添加 alignSelf**

在 PillSelector 的 View 添加 `alignSelf: 'flex-start'`，使其不强制占满整行宽度。

**理由**: 这是最小化修改的方案，从根源解决问题，且不影响 FilterDrawer 中的横向滚动使用方式。

**决策 2: 抽取 ReflectionForm 共享组件**

将新建/编辑 modal 中的表单部分抽取为独立的 ReflectionForm 组件。

**组件接口设计**:
```typescript
interface ReflectionFormProps {
  content: string;
  onContentChange: (text: string) => void;
  colorIdx: number;
  onColorIdxChange: (idx: number) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  mood: string;
  onMoodChange: (mood: string) => void;
  onSave: () => void;
  saveLabel: string;
  allTagOptions: string[];
  allMoodOptions: string[];
  dynamicTagCounts: Record<string, number>;
  onOpenTagManager: () => void;
  onOpenMoodManager: () => void;
}
```

**理由**: 
- 消除代码重复，便于维护
- 保持现有功能逻辑不变
- 符合项目组件化风格

## Risks / Trade-offs

**风险**: 修改 PillSelector 可能影响 FilterDrawer 中的横向滚动布局
**缓解**: FilterDrawer 使用 ScrollView horizontal 包裹 PillSelector，alignSelf 不影响横向滚动行为，需验证

**风险**: 抽取组件可能引入新的 props 传递问题
**缓解**: 接口设计简洁，所有数据和回调均从父组件传入，无内部状态
