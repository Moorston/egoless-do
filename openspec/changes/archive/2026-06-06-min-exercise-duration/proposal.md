## Why

当前运动保存逻辑仅检查 `sec > 0`，用户误触或短暂开始后立即退出（1-5 秒）也会生成一条运动记录，产生垃圾数据。需要按运动类型设置不同的最短时长阈值，低于阈值时弹出确认提示，让用户选择结束或继续运动。

## What Changes

- 新增运动最短时长阈值配置，按运动分 3 档：GPS/冥想/球类（60s）、耐力类（30s）、力量类（30s）
- 暂停页长按结束后，检查当前运动时长是否达到阈值
- 未达到阈值时弹出 Alert 确认框：「本次运动时间过短，无法保存记录，确定结束吗？」
  - 点击「结束」→ 直接退出运动，不保存
  - 点击「继续运动」→ 停留在暂停页
- 超过阈值时正常进入报告页

**影响平台**: mobile（暂停页交互）+ core（阈值配置）

**非目标**:
- 不修改报告页的保存逻辑（已有的 `sec > 0` 守卫保留）
- 不支持用户自定义阈值
- 不对重复运动（次数类）单独设最短次数阈值，统一用时长判断

## Capabilities

### New Capabilities
- `min-duration-guard`: 运动最短时长守卫——阈值配置 + 暂停页确认拦截逻辑

### Modified Capabilities
（无）

## Impact

- `packages/core/src/constants.ts` — 新增 `MIN_EXERCISE_DURATION` 阈值映射
- `apps/mobile/src/features/exercise/pages/PausedPage.tsx` — 长按完成后增加阈值检查 + Alert
