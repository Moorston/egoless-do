## ADDED Requirements

### Requirement: 饮水量多档快捷添加

首页饮水量卡片 SHALL 展示 4 个快捷添加按钮（200ml、250ml、350ml、500ml），替代原有的单个 +250ml 按钮。用户点击任意按钮即添加对应水量，无需确认步骤。添加量受 `waterGoal` 上限保护（`Math.min(waterMl + ml, waterGoal)`）。

#### Scenario: 点击添加 200ml
- **WHEN** 用户点击 "200ml" 按钮
- **THEN** 系统调用 `store.addWater(200)`，饮水量增加 200ml（不超过目标值）

#### Scenario: 点击添加 500ml 接近目标
- **WHEN** 当前饮水量 1800ml，目标 2000ml，用户点击 "500ml" 按钮
- **THEN** 饮水量设为 2000ml（cap 在目标值），进度条显示 100%

#### Scenario: 按钮布局
- **WHEN** 渲染饮水量卡片
- **THEN** 4 个按钮一行排列，等宽，风格为 TH.card 背景 + TH.border 边框 + P 色文字

### Requirement: 饮水目标设置保留

原有的饮水目标设置功能（铅笔图标 → 目标设置弹窗）SHALL 保持不变。

#### Scenario: 修改饮水目标
- **WHEN** 用户点击铅笔图标
- **THEN** 打开目标设置弹窗，可修改目标值（500-3000ml）
