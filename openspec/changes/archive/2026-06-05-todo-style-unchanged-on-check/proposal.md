## Why

待办项勾选后文字变灰并画删除线，视觉上暗示"已完成/已删除"，与打卡应用鼓励持续修行的理念不符。用户希望勾选前后文字样式保持一致，只通过 checkbox 图标区分状态。

## What Changes

- 去掉所有待办项勾选后的文字颜色变化（`TH.sub` → `TH.text`）
- 去掉所有待办项勾选后的删除线样式（`line-through` → `none`）
- 勾选状态仅通过 checkbox 的打勾图标和背景色来体现

**非目标：**
- 不改变 checkbox 本身的样式（打勾图标、背景色、边框色保持不变）
- 不改变待办项的交互逻辑（点击勾选/取消勾选的行为不变）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无 — 这是纯样式变更，不涉及功能需求的变化）

## Impact

**影响平台：** Web + Mobile（全部）

**影响文件（共 10 处）：**

Web 端：
- `apps/web/src/components/CheckinPage.tsx` — 2 处（计划待办 + 自定义待办）
- `apps/web/src/components/PlanDetailContent.tsx` — 3 处（今日计划项 + 自定义待办 + 历史记录）
- `apps/web/src/components/PlanTodoListModal.tsx` — 1 处（待办弹窗）

移动端：
- `apps/mobile/src/features/home/HomeScreen.tsx` — 2 处（首页待办）
- `apps/mobile/src/features/plan/PlanDetailContent.tsx` — 2 处（计划详情）

**交互描述：**
- 点击待办项 → checkbox 出现打勾图标 + 背景色变为主题主色
- 文字颜色和装饰保持不变
- 再次点击 → checkbox 恢复未勾选状态
