# 任务清单

## Core 层
- [x] Core: 新增 INCOMPLETE_REASONS 常量、IncompleteReasonCode 类型、getIncompleteItems() 检测函数
- [x] Core: 扩展 ParsedCheckinNote 接口和 parseCheckinNote() 解析 incompleteReason/incompleteNote
- [x] Core: 新增 i18n 翻译键（弹窗标题、6 个原因选项、确认/返回按钮、补充说明、原因统计标题）

## Mobile 端
- [x] Mobile HomeScreen: handleSetDone 中调用 getIncompleteItems()，有未完成项时弹出原因选择弹窗
- [x] Mobile HomeScreen: 实现 IncompleteReasonModal 组件（未完成列表 + 原因选择 + 补充说明 + 确认/返回）
- [x] Mobile HomeScreen: buildNote() 中写入 incompleteReason/incompleteNote
- [x] Mobile CheckinModal: 同样插入检测+弹窗逻辑（如支持完成操作）
- [x] Mobile CheckinDetailScreen: 展示 incompleteReason 和 incompleteNote
- [x] Mobile CheckinStatsModal: 添加月度原因分布统计卡片

## Web 端
- [x] Web CheckinPage: 移除 Done/Not Done toggle 和独立提交按钮，改为底部单一"完成"按钮
- [x] Web CheckinPage: 点击"完成"时调用 getIncompleteItems()，有未完成项时弹出原因选择弹窗
- [x] Web CheckinPage: 实现弹窗 UI（未完成列表 + 原因选择 + 补充说明 + 确认/返回）
- [x] Web CheckinPage: submit() 中写入 incompleteReason/incompleteNote
- [x] Web CheckinDetailPage: 展示 incompleteReason 和 incompleteNote
- [x] Web CheckinStatsModal: 添加月度原因分布统计卡片
