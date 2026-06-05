## Why

首页饮水量只有固定的 +250ml 按钮，无法灵活添加不同杯量；饮食记录缺少"最近常吃"快捷入口，每次添加需 3 步操作；Web 端缺少份量选择器，与 Mobile 交互不一致。这些摩擦降低了日常打卡效率。

## What Changes

- **饮水量**：单按钮 → 多档快捷按钮（200/250/350/500ml），点击即添加，无需确认
- **饮食卡片标题**："添加饮食" → "今日饮食"
- **最近常吃**：从 foodLog 历史自动统计 top 3 高频食物，展示为快捷按钮；点击打开份量选择器（2 步完成）
- **今日饮食列表**：首页饮食卡片内联展示今日已记录食物（默认 3 条），支持 ✕ 删除
- **Web 份量选择器**：Web 端添加食物统一为点击 → 份量选择（0.5/1/1.5/2x）→ 确认，与 Mobile 一致

### 非目标

- 不修改 AddFoodModal/FoodLogPage 的整体结构
- 不添加"收藏食物"功能（用最近常吃替代）
- 不修改卡路里目标设置流程
- 不修改 foodLog 数据结构（最近常吃从现有数据派生）

## Capabilities

### New Capabilities
- `home-water-quick-add`: 首页饮水量多档快捷添加按钮
- `home-food-inline`: 首页饮食卡片内联今日列表 + 最近常吃快捷入口 + Web 份量选择器统一

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

- **Mobile**：`HomeScreen.tsx`（饮水按钮 + 饮食卡片重构）、`AddFoodModal.tsx`（无变更，仅 Web 端对齐）
- **Web**：`HomeTab.tsx`（饮水按钮 + 饮食卡片重构 + 份量选择器新增）
- **Core**：无数据模型变更，无 store 变更
- **平台**：Web + Mobile 全部涉及
