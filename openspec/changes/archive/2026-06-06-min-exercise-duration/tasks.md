## 1. 阈值配置

- [x] 1.1 在 `packages/core/src/constants.ts` 中新增 `getMinDuration(sportKey: string): number` 函数，按运动名返回最短时长阈值（60s/30s/30s），未命中返回默认值 30 秒
- [x] 1.2 在 `packages/core/src/index.ts` 中导出 `getMinDuration`

## 2. 暂停页拦截逻辑

- [x] 2.1 在 `apps/mobile/src/features/exercise/pages/PausedPage.tsx` 的 `onHoldStart` 中，当计时完成（p >= 1）时，调用 `getMinDuration(sportName)` 检查当前时长是否达到阈值
- [x] 2.2 未达阈值时调用 `Alert.alert()` 显示确认对话框（标题「运动时间过短」，正文「本次运动时间过短，无法保存记录，确定结束吗？」，按钮「结束」+「继续运动」）
- [x] 2.3 点击「结束」调用 `onGoBack()` 退出运动；点击「继续运动」不做操作，停留在暂停页
- [x] 2.4 达到阈值时保持原有逻辑：pulse 动画 + setPage('report')
