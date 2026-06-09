## Context

计划详情页面（PlanDetailContent.tsx）显示任务进度条和打卡频率配置。当前存在三个问题：

1. **进度计算**: `computeItemProgress` 函数遍历 `checkins` 数组计算 `doneCount`，但不检查同一 `planItemId + date` 是否有重复条目。当 localStorage 中存在重复记录时，`doneCount` 被虚增，导致进度显示 100%。

2. **频率标题**: `freqDaily` 翻译为"每天"，在 PlanCreatePage.tsx 中作为频率选择器的标题显示，用户误以为是"每天打卡"而非"频率设置"。

3. **Input 框交互**: interval/weekly/monthly 模式的 input 框使用 `parseInt(e.target.value) || 1`，当用户删除数字时 `parseInt('')` 返回 `NaN`，`NaN || 1` 立即变回 1，无法输入新值。

## Goals / Non-Goals

**Goals:**
- 修复任务进度计算，确保按唯一日期去重
- 修正频率选择器标题翻译
- 修复频率 input 框的交互体验

**Non-Goals:**
- 不修改计划级进度（ProgressRing）
- 不修改 `computeExpectedDays` 的计算逻辑
- 不修改其他频率模式的翻译
- 不修改移动端 UI（问题仅在 web 端）

## Decisions

### 1. 进度计算去重方案

**选择**: 在 `computeItemProgress` 中使用 Set 按日期去重

```typescript
export function computeItemProgress(item: PlanItem, checkins: PlanItemCheckin[], today: string): number {
  const clampedToday = today > item.endDate ? item.endDate : today;
  const expectedDays = computeExpectedDays(item.frequency, item.startDate, item.endDate, today);
  if (expectedDays <= 0) return 0;

  const doneDates = new Set<string>();
  for (const c of checkins) {
    if (c.planItemId === item.id && c.done && c.date >= item.startDate && c.date <= clampedToday) {
      doneDates.add(c.date);
    }
  }

  return Math.min(Math.round((doneDates.size / expectedDays) * 100), 100);
}
```

**备选方案**: 在数据层（store/sync）去重
- 优点: 从源头解决问题
- 缺点: 需要修改多处数据加载逻辑，风险更大

**理由**: 计算层去重更安全，不影响数据存储，且能兼容历史数据。

### 2. Input 框交互方案

**选择**: 使用受控组件模式，允许空字符串状态

```typescript
const [intervalValue, setIntervalValue] = useState(String(item.frequency?.every ?? 3));

<input
  type="number"
  min={1}
  value={intervalValue}
  onChange={e => {
    const val = e.target.value;
    setIntervalValue(val);
    const num = parseInt(val);
    if (!isNaN(num) && num >= 1) {
      updateItem(item.id, { frequency: { mode: 'interval', every: num } });
    }
  }}
  onBlur={() => {
    if (intervalValue === '' || parseInt(intervalValue) < 1) {
      setIntervalValue('1');
      updateItem(item.id, { frequency: { mode: 'interval', every: 1 } });
    }
  }}
/>
```

**备选方案**: 使用 `Math.max(1, parseInt(e.target.value) || 1)` 的现有逻辑
- 缺点: 无法删除数字输入新值

**理由**: 受控组件模式允许用户自由编辑，失焦时才验证并修正。

### 3. 翻译修改

直接修改 `packages/core/src/i18n/zh.ts` 中的 `freqDaily` 值。

## Risks / Trade-offs

- **进度计算去重**: 如果用户同一天真的完成了两次打卡（理论上不应发生），去重会忽略第二次。这是预期行为。
- **Input 框方案**: 需要为 interval/weekly/monthly 三种模式都添加本地状态，代码量增加。但这是标准的受控组件模式，维护成本低。
- **翻译修改**: 仅修改中文翻译，其他语言不受影响。
