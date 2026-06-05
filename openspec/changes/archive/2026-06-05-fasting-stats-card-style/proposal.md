# 禁食页统计卡片风格统一

## 问题

禁食页"你的统计"卡片使用渐变背景白色文字风格，与打卡统计弹窗的纯色卡片风格不一致。

## 修复范围

- `apps/mobile/src/features/fasting/FastingScreen.tsx`
- `apps/web/src/components/FastingTab.tsx`

## 统一方案

混合两种风格：
- 字体大小、圆角、图标大小：取禁食页的值
- 背景、边框、颜色：取打卡统计弹窗的值
- 布局：保持 2 列
