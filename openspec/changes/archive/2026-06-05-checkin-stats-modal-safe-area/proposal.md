# 打卡统计弹窗安全区域修复

## 问题

移动端打卡统计弹窗（CheckinStatsModal）存在安全区域遮挡问题：
- 顶部 Header 被刘海/状态栏遮挡
- 底部统计卡片被 Home Indicator 遮挡

## 根因

当前使用 `SafeAreaView` 包裹内容，但内部 `View` 的实色背景 `TH.bg` 会绘制到安全区域之下，导致内容被遮挡。`SafeAreaView` 在 `transparent` Modal 中行为不一致。

## 修复范围

- `apps/mobile/src/features/home/CheckinStatsModal.tsx`

## 修复方案

将 `SafeAreaView` 替换为 `useSafeAreaInsets()` 模式，与 `AddFoodModal` 保持一致：
- 用 `insets.top` 作为 Header 上方 padding
- 用 `insets.bottom` 作为 ScrollView content 底部 padding
