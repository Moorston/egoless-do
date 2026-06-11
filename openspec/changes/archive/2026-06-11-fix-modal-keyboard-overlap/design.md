## Context

Mobile 端模态框中的输入框在弹出输入法时被遮挡。当前 6 个含输入框的模态框中，3 个完全缺少 `KeyboardAvoidingView`，3 个有 KAV 但配置不完整。

## Goals / Non-Goals

**Goals:**
- 所有含输入框的模态框在键盘弹出时自动上推内容，输入框始终可见
- iOS 和 Android 表现一致

**Non-Goals:**
- 不改动 web 端
- 不改动全屏页面（PlanCreateScreen 已有 KAV）
- 不引入第三方键盘库（如 `react-native-keyboard-aware-scroll-view`）

## Decisions

### 1. 统一使用 `KeyboardAvoidingView` 包裹模态框内容

**方案**: 在每个含输入框的 `<Modal>` 内部，用 `<KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>` 包裹内容区域。

**替代方案**: 使用 `react-native-keyboard-aware-scroll-view` — 需要新增依赖，且对于简单场景过于重量级。

**理由**: KAV 是 React Native 内置组件，零依赖，已在此项目中广泛使用。

### 2. 对底部弹出模态框使用 `justifyContent:'flex-end'` + KAV

已有 KAV 的模态框（新建/编辑感念、添加/编辑习惯）采用此模式，验证有效。缺失 KAV 的 3 个模态框需要适配：

- **创建计划任务**（ReflectionsScreen）: 当前居中布局，需改为底部弹出 + KAV
- **状态变更原因**（HabitsScreen）: 当前居中布局，需改为底部弹出 + KAV
- **创建思维脉络**（CreateThoughtTrailModal）: 当前居中布局，需改为底部弹出 + KAV

### 3. ScrollView 配置

模态框内含多个输入框时，内容区使用 `ScrollView` 并设置：
- `keyboardShouldPersistTaps="handled"` — 点击其他输入框时不收起键盘
- `showsVerticalScrollIndicator={false}` — 隐藏滚动条

## Risks / Trade-offs

- [模态框布局风格变更] 3 个居中模态框改为底部弹出，视觉风格变化 → 与项目中其他模态框保持一致，降低突兀感
- [Android 兼容性] `behavior="height"` 在某些 Android 设备上表现不一致 → 已在现有模态框中验证可用
