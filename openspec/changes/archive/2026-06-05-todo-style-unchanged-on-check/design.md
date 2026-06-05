## Context

当前待办项勾选后有两处样式变化：
1. 文字颜色从 `TH.text` 变为 `TH.sub`（灰色）
2. 文字装饰从 `none` 变为 `line-through`（删除线）

这些样式在 Web 端和移动端共 10 处使用相同的条件表达式模式。

## Goals / Non-Goals

**Goals:**
- 去掉勾选后的文字颜色变化
- 去掉勾选后的删除线样式
- 保持 checkbox 本身的视觉反馈不变

**Non-Goals:**
- 不改变 checkbox 组件的样式
- 不改变待办项的交互逻辑
- 不抽取共享样式常量（改动太简单，不值得）

## Decisions

**决策：直接去掉条件表达式，不做重构**

每处改动都是将：
```tsx
color: done ? TH.sub : TH.text,
textDecoration: done ? 'line-through' : 'none',
```
改为：
```tsx
color: TH.text,
```

理由：
- 改动量小且机械，不值得抽取共享样式
- 保持各组件的独立性，避免引入不必要的抽象
- 历史记录区域（PlanDetailContent ~650行）的反向逻辑也一并删除

## Risks / Trade-offs

**风险：用户可能失去"已完成"的视觉区分感**
→ 缓解：checkbox 的打勾图标和背景色变化已足够提供完成状态的反馈

**权衡：去掉删除线后，已完成和未完成项在文字层面无区别**
→ 接受：这是用户的明确需求，且 checkbox 本身提供了足够的状态区分
