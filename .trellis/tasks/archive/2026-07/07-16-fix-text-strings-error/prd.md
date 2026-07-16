# 修复 Text strings 渲染错误

## Goal

修复 BodyScreen 及其子组件中 "Text strings must be rendered within a <Text> component" 错误。

## Background

React Native 要求所有在 `<Text>` 组件中渲染的值必须是字符串类型。数字、对象等非字符串值会导致运行时错误。

## 发现的问题

### BodyDashboard.tsx
1. **Line 641**: `{r.weight}` — 体重数值直接渲染
2. **Line 851**: `{planProgress.totalDuration}` — 训练时长直接渲染
3. **Line 855**: `{planProgress.totalCal}` — 卡路里直接渲染
4. **Line 859**: `{planProgress.weekComplete}` — 完成天数直接渲染
5. **Line 885**: `{Math.floor(e.durationSec / 60)}分钟` — 时长数值直接渲染

### WeightTrendChart.tsx
1. **Line 151**: `{point.weight}` — 体重数值直接渲染

### CheckinSuccessCard.tsx
1. **Line 119**: `{item.value}` — 觉知数据数值直接渲染

## 修复方案

使用 `String()` 将所有数值转换为字符串：
- `{r.weight}` → `{String(r.weight)}`
- `{planProgress.totalDuration}` → `{String(planProgress.totalDuration)}`
- `{planProgress.totalCal}` → `{String(planProgress.totalCal)}`
- `{planProgress.weekComplete}` → `{String(planProgress.weekComplete)}`
- `{Math.floor(e.durationSec / 60)}` → `{String(Math.floor(e.durationSec / 60))}`
- `{point.weight}` → `{String(point.weight)}`
- `{item.value}` → `{String(item.value)}`

## Acceptance Criteria

- [ ] BodyScreen 不再报 Text strings 错误
- [ ] 所有数值使用 String() 转换
- [ ] 测试通过
- [ ] 无新增 any 类型

## Scope

- `apps/mobile/src/features/practice/body/BodyDashboard.tsx`
- `apps/mobile/src/features/practice/body/WeightTrendChart.tsx`
- `apps/mobile/src/features/practice/body/CheckinSuccessCard.tsx`
