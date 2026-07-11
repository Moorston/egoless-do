# 平台兼容性审查

## Goal

审查 iOS 和 Android 平台兼容性，确保应用在两个平台上行为一致。

## Requirements

- 检查平台特定 API 使用（Platform.OS 分支）
- 检查原生模块兼容性（expo-av → expo-audio 迁移状态）
- 检查字体渲染差异（iOS/Android 字体回退）
- 检查通知权限处理差异
- 检查 SecureStore/Keychain 兼容性
- 检查地图组件（react-native-maps vs amap3d）平台适配
- 产出平台兼容性报告

## Acceptance Criteria

- [ ] 所有 Platform.OS 分支正确处理
- [ ] 原生模块在两平台正常工作
- [ ] 字体在两平台渲染一致
- [ ] 通知在两平台正常触发
- [ ] 兼容性报告产出

## Scope

重点关注：音频播放（expo-audio）、地图（amap3d）、安全存储（SecureStore）
