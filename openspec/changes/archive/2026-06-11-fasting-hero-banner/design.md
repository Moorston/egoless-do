## Context

禁食页当前有 5 个独立区域：主功能卡、全球禁食入口、禁食记录入口、统计 2x2 网格、卡路里 1x2 网格。需要整合为 Hero Banner + 主功能卡 + 健康提示。

## Decisions

### Hero Banner 结构
- 渐变色 `['#17EAD9', '#6078EA']`
- 标题栏：`禁食` + `禁食记录 >`（可点击跳转 FastHistory）
- 3 列统计：总次数 | 总时长 | 连续（当前天数 + 最长天数副标题）
- kcal 行：🔥 kcal 节省 | ⚖️ kg 预计减重
- 底部入口：🌐 连接世界 — 全球禁食者（可点击跳转 GlobalMap）

### 移除的独立卡片
- 全球禁食入口（移入 Hero Banner）
- 禁食记录入口（移入 Hero Banner 标题栏）
- 统计数据 2x2 网格（移入 Hero Banner 3 列）
- 卡路里 1x2 网格（移入 Hero Banner kcal 行）
