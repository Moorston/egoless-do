## ADDED Requirements

### Requirement: 饮食卡片标题改为"今日饮食"

首页饮食卡片标题 SHALL 从"添加饮食"改为"今日饮食"。底部"添加饮食"按钮文案保留不变。

#### Scenario: 标题显示
- **WHEN** 渲染首页饮食卡片
- **THEN** 卡片标题显示"今日饮食"（使用 `T('todayFood')` 翻译键）

### Requirement: 最近常吃快捷入口

首页饮食卡片 SHALL 展示"最近常吃"区域，从 `foodLog` 中按 `name` 聚合计数，取 top 3 非删除项作为快捷按钮。

#### Scenario: 展示最近常吃
- **WHEN** foodLog 中有历史记录
- **THEN** 显示 top 3 高频食物按钮，格式为"食物名 卡路里kcal"

#### Scenario: 无历史记录
- **WHEN** foodLog 为空或全部已删除
- **THEN** 不显示"最近常吃"区域

#### Scenario: 点击最近常吃
- **WHEN** 用户点击某食物按钮
- **THEN** 打开份量选择器（0.5/1/1.5/2x），确认后添加到 foodLog

### Requirement: 今日饮食列表

首页饮食卡片 SHALL 内联展示今日已记录的食物列表，默认显示最近 3 条。

#### Scenario: 展示今日记录
- **WHEN** 今日有 foodLog 记录
- **THEN** 显示最近 3 条，每条包含食物名、卡路里、删除按钮（✕）

#### Scenario: 超过 3 条
- **WHEN** 今日记录超过 3 条
- **THEN** 显示最近 3 条 + "共 N 条"提示

#### Scenario: 删除今日记录
- **WHEN** 用户点击某条记录的 ✕ 按钮
- **THEN** 调用 `store.deleteFood(id)` 软删除该记录

#### Scenario: 无今日记录
- **WHEN** 今日无 foodLog 记录
- **THEN** 不显示"今日已记录"区域

### Requirement: Web 端份量选择器

Web 端 HomeTab 的食物列表 SHALL 统一为点击 → 份量选择 → 确认的交互模式，与 Mobile AddFoodModal 一致。

#### Scenario: 单击食物打开编辑区
- **WHEN** 用户在 Web 端食物列表中单击某食物
- **THEN** 展开编辑区，显示份量选择（0.5/1/1.5/2x）、卡路里计算、确认/取消按钮

#### Scenario: 双击快速添加
- **WHEN** 用户在 Web 端食物列表中双击某食物
- **THEN** 直接添加 1 份该食物，无需确认

#### Scenario: 确认添加
- **WHEN** 用户选择份量后点击确认
- **THEN** 按份量计算卡路里，调用 `addFood()` 添加记录
