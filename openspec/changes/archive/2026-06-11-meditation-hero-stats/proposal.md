## Why

冥想页的"累计打居"和"今日打居"分散在两个独立 Card 中，视觉层级不突出。参考运动页的 Hero Banner 统计卡片，将统计数据整合到一个渐变背景的 Hero 区域，增加"累计打居次数"统计。

## What Changes

- 移除独立的"累计打居"Card 和"今日打居"Card
- 新建 Hero Banner：渐变背景，包含累计分钟、今日分钟、累计次数 3 个统计列
- Hero Banner 顶部右侧内联"冥想历史"入口
- Hero Banner 底部内联"全球冥想者"入口

## Impact

- `apps/mobile/src/features/meditation/MeditationScreen.tsx` — 布局重构
