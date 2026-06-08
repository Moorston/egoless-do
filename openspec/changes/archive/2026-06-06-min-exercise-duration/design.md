## Context

当前 `handleSave` 仅检查 `sec > 0`，任何有计时的运动都会被保存。用户误触或短暂体验后退出会产生无意义记录。

暂停页（PausedPage）是用户长按 3 秒结束运动的入口，也是最适合做拦截检查的位置——在进入报告页之前就能判断并拦截。

## Goals / Non-Goals

**Goals:**
- 按运动类型设置 3 档最短时长阈值（60s / 30s / 30s）
- 暂停页长按结束后，未达阈值时弹 Alert 确认，让用户选择结束或继续

**Non-Goals:**
- 不支持用户自定义阈值
- 不对次数类运动单独设最短次数阈值
- 不修改报告页或 handleSave 的现有守卫逻辑
- 不涉及 web 端（web 端暂无暂停页交互）

## Decisions

### 1. 阈值配置放在 `packages/core/src/constants.ts`

与 `MET_MAP`、`getSportType` 同文件维护，导出 `getMinDuration(sportKey: string): number` 函数。

内部按运动名映射，未命中时返回默认值 30 秒。映射关系：

```
60s 档: GPS 运动 + 冥想类 + 球类
30s 档: 耐力类 + 力量类
```

**替代方案**: 在 PausedPage 内硬编码 → 不利于复用和维护。

### 2. 拦截逻辑在 PausedPage 的 `onHoldStart` 回调中

当 `requestAnimationFrame` 循环检测到 `p >= 1`（3 秒计时完成）时，先调用 `getMinDuration(sportKey)` 检查阈值：
- 达到阈值 → 正常执行 pulse 动画 + `setPage('report')`
- 未达到 → 直接 `Alert.alert()`，不执行 pulse 动画

**替代方案**: 进入报告页后再检查 → 用户已经看到数据了再被丢弃，体验差。

### 3. 使用 React Native 原生 `Alert.alert()`

确认对话框使用 `Alert.alert()`，无需自定义模态框。按钮配置：
- 「结束」: `style: 'destructive'`，调用 `onGoBack()` 退出
- 「继续运动」: `style: 'cancel'`，不做任何操作（停留在暂停页）

### 4. PausedPage 需要接收 `sportName` prop

当前 PausedPage 通过 `ExercisePageProps` 已有 `sportName`，可直接用于查询阈值。需要额外导入 `getMinDuration` 函数。

## Risks / Trade-offs

- **风险**: 用户确实想记录一次 20 秒的平板支撑 → 当前 30s 阈值可能误拦。**缓解**: 30s 档已经较宽松，且用户可以选择继续运动。
- **风险**: Alert 弹出时 pulse 动画已开始 → 需要在 p >= 1 时先判断再决定是否播放动画。
