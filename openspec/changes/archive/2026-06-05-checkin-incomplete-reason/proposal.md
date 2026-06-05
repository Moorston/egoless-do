## Why

当前打卡流程中，用户点击"完成"后直接提交，即使有未完成的修行、习惯或计划项也不会有任何提示。这导致用户容易"无感跳过"未完成项，缺乏对自身行为的反思机会。同时，未完成的原因无法被记录和追踪，失去了自我觉察的数据基础。

本次变更在"完成"按钮触发时检测未完成项，弹窗确认并要求选择原因，将"未完成"从隐性忽略变为显性记录。

## What Changes

- **未完成检测**: 点击"完成"时，检测当日 practices、habits、planItems 是否全部完成
- **原因选择弹窗**: 有未完成项时弹出确认弹窗，显示未完成列表，要求选择原因（6 个预设 + 补充说明）
- **原因持久化**: 将 `incompleteReason` 和 `incompleteNote` 写入 checkin note JSON
- **打卡详情展示**: CheckinDetail 页面展示当日未完成原因
- **原因统计**: 在打卡统计弹窗中展示月度未完成原因分布
- **Web 端交互统一**: Web CheckinPage 去掉 Done/Not Done toggle 和独立提交按钮，改为与 Mobile 一致的"点击完成即提交"模式

**非目标**:
- 不做每项单独原因（采用每日统一原因）
- 不做原因的自动分析或 AI 建议
- 不做原因的导出功能

## Capabilities

### New Capabilities
- `checkin-incomplete-reason`: 打卡未完成原因收集与追踪——弹窗确认、原因选择、原因持久化、打卡详情展示、原因统计

### Modified Capabilities

## Impact

| 文件/模块 | 变更类型 |
|-----------|---------|
| `packages/core/src/i18n/` | 新增原因代码翻译键 |
| `apps/mobile/src/features/home/HomeScreen.tsx` | `handleSetDone` 插入检测+弹窗逻辑 |
| `apps/mobile/src/features/home/CheckinModal.tsx` | 同上（如支持完成操作） |
| `apps/web/src/components/CheckinPage.tsx` | 交互重构：去掉 toggle + 提交按钮，改为单一完成按钮 |
| Mobile + Web `CheckinDetail` | 展示 incompleteReason/incompleteNote |
| Mobile + Web `CheckinStatsModal` | 添加原因分布统计卡片 |

**平台**: 全部（Mobile + Web）
