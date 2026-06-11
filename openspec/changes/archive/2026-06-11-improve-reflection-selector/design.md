## Approach

### 布局修复

根本原因：container 只有 `maxHeight: '80%'` 没有 `flex: 1`，selector 的 `flex: 1` 无法撑满空间。

修复方案：
- container 添加 `flex: 1`（在 KAV 内部撑满）
- 去掉 reflectionList 的 `maxHeight: 300` 限制，让列表自然撑满
- selector 添加 `flex: 1` 确保占满 container 剩余空间

### 搜索功能

selector 模式顶部添加 TextInput 搜索框，按 `r.content` 关键词过滤（不区分大小写）。

### 信息增强

每个 reflection item 显示：
- 日期（已有）
- 内容前 2 行（已有）
- mood emoji（如果有）
- tags 前 2 个（如果有）
- 已关联脉络数（如果 > 0）

### 脉络归属提示

已属于其他脉络的感念，item 右侧显示脉络数量角标。
