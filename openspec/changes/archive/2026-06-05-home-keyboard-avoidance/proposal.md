## Why

Mobile 端首页的 Note 输入框在 ScrollView 中，没有 KeyboardAvoidingView 包裹。当用户点击输入框时，输入法弹出但页面不会自动滚动到输入框位置，导致输入框被输入法遮挡，影响用户体验。

## What Changes

- 在 HomeScreen.tsx 中添加 KeyboardAvoidingView 和 Platform 导入
- 在 SafeAreaView 外层包裹 KeyboardAvoidingView
- iOS 使用 `behavior="padding"`，Android 使用 `behavior="height"`

**非目标：**
- 不改变其他页面的键盘避让逻辑（已有 KeyboardAvoidingView）
- 不改变 Note 输入框本身的样式和交互
- 不引入新的依赖（使用 React Native 内置的 KeyboardAvoidingView）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无 — 这是纯 UI 修复，不涉及功能需求的变化）

## Impact

**影响平台：** Mobile（仅移动端）

**影响文件：**
- `apps/mobile/src/features/home/HomeScreen.tsx` — 添加 KeyboardAvoidingView 包裹

**交互描述：**
- 用户点击 Note 输入框 → 输入法弹出 → 页面自动滚动到输入框位置
- iOS 和 Android 使用不同的 behavior 策略以适配各自平台
