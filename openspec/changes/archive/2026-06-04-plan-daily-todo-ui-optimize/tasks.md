## 1. 统计区域精简

- [x] 1.1 移除 todo tab 中统计卡片下方的进度条（PlanDetailContent.tsx 第 423-430 行）

## 2. Checkbox 替代 Toggle

- [x] 2.1 将计划任务的 toggle 开关替换为 checkbox（PlanDetailContent.tsx 第 443-485 行）
- [x] 2.2 将自定义待办的 toggle 开关替换为 checkbox（PlanDetailContent.tsx 第 488-532 行）

## 3. 分组标题

- [x] 3.1 添加计划任务分组标题（ClipboardList 图标 + "每日待办 (N)"）
- [x] 3.2 添加自定义待办分组标题（Pencil 图标 + "每日自定义待办 (N)"）

## 4. 历史记录手风琴

- [x] 4.1 添加 expandedDates 状态，实现手风琴展开/折叠逻辑
- [x] 4.2 将历史记录渲染改为手风琴模式，最近一天默认展开

## 5. 验证

- [x] 5.1 验证 checkbox 点击切换和动画效果
- [x] 5.2 验证分组标题的条件渲染
- [x] 5.3 验证手风琴展开/折叠功能
