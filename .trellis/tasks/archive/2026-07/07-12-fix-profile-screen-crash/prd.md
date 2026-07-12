# 修复 ProfileScreen 因 expo-image-picker 导入 createPermissionHook 报错

## Goal

修复用户资料页 (ProfileScreen) 点击导航时报错崩溃的问题：

```
TypeError: 0, _expo.createPermissionHook is not a function (it is undefined)
Element type is invalid. Received a promise that resolves to: undefined
```

## 根因

`expo-image-picker@57.0.2` 的 `src/ImagePicker.ts` 从 `'expo'` 导入了 `createPermissionHook`，但 **Expo SDK 54** 已从 `expo` 主包中移除了 `createPermissionHook`。该函数实际位于 `expo-modules-core` 包中。

## 修复方案

使用 pnpm `patchedDependencies` 机制，将 `expo-image-picker/src/ImagePicker.ts` 中的 `from 'expo'` 改为 `from 'expo-modules-core'`。

## Acceptance Criteria

- [x] `expo-image-picker` 补丁已创建并正确应用
- [x] ProfileScreen 导航不再崩溃
- [x] 头像选择功能正常（权限请求可工作）
- [x] 补丁在 `pnpm install` 后自动生效