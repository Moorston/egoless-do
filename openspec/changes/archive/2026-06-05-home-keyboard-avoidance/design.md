## Context

Mobile 端首页 HomeScreen.tsx 的布局结构：
```
SafeAreaView
  └── ScrollView
        └── Note 输入框（ThemedInput）
```

当前没有 KeyboardAvoidingView 包裹，导致输入法弹出时输入框被遮挡。

对比其他页面（CheckinModal、ReflectionsScreen）已有 KeyboardAvoidingView 实现。

## Goals / Non-Goals

**Goals:**
- 在 HomeScreen 外层添加 KeyboardAvoidingView
- 输入法弹出时自动滚动到输入框位置
- 保持与项目其他页面一致的键盘避让策略

**Non-Goals:**
- 不改变 Note 输入框本身的样式和交互
- 不引入新的依赖（如 react-native-keyboard-aware-scroll-view）
- 不修改其他页面的键盘避让逻辑

## Decisions

**决策：使用 React Native 内置的 KeyboardAvoidingView**

理由：
- 项目中已有使用先例（CheckinModal、ReflectionsScreen 等 8 个文件）
- 无需引入新依赖
- 实现简单，只需包裹一层组件

**决策：iOS 使用 padding，Android 使用 height**

理由：
- 与项目中其他页面的实现保持一致
- iOS 的 padding 行为更适合处理输入法避让
- Android 的 height 行为更稳定

## Risks / Trade-offs

**风险：某些 Android 设备上 KeyboardAvoidingView 可能不稳定**
→ 缓解：项目中已有 8 个文件使用相同策略，未见问题报告

**权衡：KeyboardAvoidingView 包裹整个页面，而非仅包裹输入框**
→ 接受：这是 React Native 的标准做法，确保整个页面内容都能被推到输入法上方
