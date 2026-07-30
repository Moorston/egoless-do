# 技术设计 — SleepSummaryCard 重构

## 1. 概述

将 `SleepSummaryCard` 从"三段式状态机（Empty/Read/Edit）+ 全卡编辑"重构为"两段式（Empty/Read）+ 字段级增量保存"。移除 `editing` 布尔态，质量星和工作状态 chip 在 Read 模式下直接可编辑。

## 2. 组件接口

### 2.1 Props（保持不变）

```ts
interface Props {
  todaySleep: SleepEntry | null | undefined;
  onSaveQuickDiary: (quality: number, workState?: WorkState | null) => void;
  onOpenFullDiary: () => void;
}
```

**决策**：保持 Props 接口不变，降低 `HomePage` 调用方改动成本。`onSaveQuickDiary` 的 `workState` 参数改为允许 `null`（取消选中语义）。

### 2.2 调用方（HomePage）调整

```tsx
<SleepSummaryCard
  todaySleep={todaySleep}
  onSaveQuickDiary={(quality, workState) => saveSleepDiary({ quality: quality as 1|2|3|4|5, workState })}
  onOpenFullDiary={() => onSetShowDiary(true)}
/>
```

注意：`saveSleepDiary` 的合并逻辑（`{ ...existing, ...partial }`）会自动处理 `workState: null`——但需确认 store 层是否允许 `null` 覆盖。若不允许，需调整 store 或用 `undefined` 跳过。

**风险点**：`createSleepSlice.ts:57` 的 `{ ...existing, ...partial }` 会显式写入 `workState: null`。当前 `SleepEntry.workState?: WorkState` 类型允许 `undefined` 但不允许 `null`。需要：
- 方案 A：调用方传 `undefined` 表示"不修改 workState"（但 spread 会写入 `undefined`，效果等同于删除字段，store 读取时回退到 `undefined`，可接受）。
- 方案 B：`onSaveQuickDiary` 内部在 `workState === null` 时转成 `undefined`。

**推荐方案 B**：在 `SleepSummaryCard` 内部处理，不污染 store 层。

## 3. 状态模型

### 3.1 旧模型（移除）

```ts
const [editing, setEditing] = useState(false);   // 移除
const [draftQuality, setDraftQuality] = useState(0);  // 移除
const [draftWorkState, setDraftWorkState] = useState<WorkState | null>(null);  // 移除
```

### 3.2 新模型

**无本地草稿状态**。所有编辑直接映射到 props 的 `todaySleep`，通过 `onSaveQuickDiary` 持久化。

保留的本地状态：无（纯展示 + 回调）。

### 3.3 视觉状态机（简化为两段）

```
┌──────────────────────────────────────────────┐
│           SleepSummaryCard                   │
├──────────────────┬───────────────────────────┤
│   Empty          │       Read                │
│ (todaySleep=null)│  (todaySleep 存在)        │
├──────────────────┼───────────────────────────┤
│ 标题 + 日期      │ 标题 + 日期 + diary链接    │
│ 引导文案         │ [质量星 ★★★★★] ← 可点    │
│ [记录按钮] ← CTA │ 质量文字（好/一般/差）    │
│                  │ 时长 + 目标对比           │
│                  │ 入睡 → 起床               │
│                  │ [工作状态 chip] ← 可点    │
│                  │ 仪轨 · 感恩               │
└──────────────────┴───────────────────────────┘
```

## 4. 保存协议

### 4.1 质量星点击

```ts
const handleStarPress = (i: number) => {
  const currentWorkState = todaySleep?.workState ?? null;
  onSaveQuickDiary(i, currentWorkState);  // 完整对
  triggerFeedback();  // haptic + toast
};
```

### 4.2 工作状态 chip 点击

```ts
const handleWorkStatePress = (key: WorkState) => {
  const currentQuality = todaySleep?.quality ?? 0;
  const next = todaySleep?.workState === key ? null : key;  // toggle
  onSaveQuickDiary(currentQuality || 1, next);  // quality 不能为 0，若当前无质量默认传 1
  triggerFeedback();
};
```

**注意**：`onSaveQuickDiary` 的 `quality` 参数类型是 `number`，但 `saveSleepDiary` 内部会写入 `quality: 0`。若 `currentQuality === 0`（用户从未评过质量），此时传 0 会保存一个无效质量。需要：
- 若 `currentQuality === 0`，默认传 1（保底），或
- 在 `onSaveQuickDiary` 调用方（HomePage）限制：`quality = Math.max(1, currentQuality)`。

**推荐**：在 `SleepSummaryCard` 内部处理，`Math.max(1, currentQuality)`。

### 4.3 反馈触发

```ts
const triggerFeedback = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  useUiStore.getState().showToast('已保存', 'success');
};
```

需确认项目中 `Haptics` 的导入路径（`expo-haptics`）和 `useUiStore` 的用法。

## 5. 视觉规范

### 5.1 布局层次（Read 模式）

```
┌─ 睡眠记录 · 7月30日 ──────────────── 📓 ┐
│                                           │
│   ★★★★★          ← 32px，主视觉         │
│   质量：好                                │
│                                           │
│   7h12m  ·  目标 8h  ·  差 48m           │
│                                           │
│   🌙 23:30 ────────────── ☀️ 06:42       │
│                                           │
│   工作状态: [精神][正常][疲惫][筋疲力尽]   │
│   仪轨 ✓  ·  感恩 ×2                      │
└───────────────────────────────────────────┘
```

### 5.2 质量星尺寸

- Read 模式展示：28px（维持原尺寸，但放在主位置）
- 质量星数量：5 颗，间距 6px
- 颜色：`#F59E0B`（STAR_FILL 保持不变）

### 5.3 目标对比计算

```ts
const targetMin = sleepGoal.targetHours * 60;
const diff = durationMin - targetMin;
const diffLabel = diff >= 0
  ? `+${Math.floor(diff / 60)}h${diff % 60}m`
  : `-${Math.floor(-diff / 60)}h${-diff % 60}m`;
const isOnTarget = Math.abs(diff) <= 30;  // 30 分钟内算达成
```

仅在 `sleepGoal.enabled && durationMin > 0` 时展示目标对比。

### 5.4 工作状态 chip

- 样式维持当前的 chip 样式（选中态：`borderColor: primary, backgroundColor: primary 20%`）
- Read 模式下 chip 直接可点（移除 `disabled`）

### 5.5 时间行图标

- 入睡图标：`Moon`（来自 `lucide-react-native`，与 DetailModal 一致）
- 起床图标：`Sun`（来自 `lucide-react-native`）
- 移除 emoji（🛌 ☀️）

### 5.6 仪轨 badge

- 文案：`仪轨`（去掉 ✅ emoji）
- 样式：绿色 badge（`backgroundColor: 'rgba(16,185,129,0.2)', color: '#10B981'`）

## 6. 无障碍设计

### 6.1 质量星

```tsx
<TouchableOpacity
  key={i}
  accessibilityLabel={i <= quality ? `当前 ${i} 星` : `设为 ${i} 星`}
  accessibilityRole="button"
  accessibilityState={{ selected: i <= quality }}
  accessibilityHint="点击直接保存睡眠质量"
  onPress={() => handleStarPress(i)}
  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
>
  <Star size={28} color={i <= quality ? STAR_FILL : TH.border} fill={i <= quality ? STAR_FILL : 'transparent'} />
</TouchableOpacity>
```

### 6.2 工作状态 chip

```tsx
<TouchableOpacity
  key={key}
  accessibilityLabel={`工作状态: ${T(labelKey)}`}
  accessibilityRole="button"
  accessibilityState={{ selected }}
  accessibilityHint="点击直接保存工作状态"
  onPress={() => handleWorkStatePress(key)}
  style={[s.chip, { borderColor: selected ? TH.primary : TH.border, backgroundColor: selected ? `${TH.primary}20` : 'transparent' }]}
>
  <Text style={[s.chipText, { color: selected ? TH.primary : TH.text }]}>{T(labelKey)}</Text>
</TouchableOpacity>
```

### 6.3 完整日记链接

```tsx
<TouchableOpacity
  accessibilityLabel="打开完整睡眠日记"
  accessibilityRole="link"
  onPress={onOpenFullDiary}
>
  <Text>完整日记 →</Text>
</TouchableOpacity>
```

## 7. 文件改动清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `SleepSummaryCard.tsx` | 重构 | 移除 editing 状态、重排布局、增量保存、a11y |
| `HomePage.tsx` | 微调 | 调整 `onSaveQuickDiary` 传递逻辑（确保完整对） |
| `sleepSummaryLogic.ts` | 可能 | 若需新增质量文字映射（好/一般/差）工具函数 |
| `sleepStyles.ts` | 不动 | 样式从 `SleepSummaryCard.tsx` 的 StyleSheet |
| `createSleepSlice.ts` | 不动 | 已满足需求 |
| `SleepEngine.tsx` | 不动 | 不改动页面路由 |

## 8. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| `workState: null` 写入 store | 类型不匹配 / 后续读取异常 | 方案 B：组件内转 `undefined` |
| `currentQuality === 0` 时保存无效质量 | 数据脏 | `Math.max(1, currentQuality)` 保底 |
| 直接保存误触 | 用户误操作 | haptic + Toast 明确反馈；误触后再点一次即可改正 |
| `Haptics` 导入路径错误 | 运行时报错 | 实现时核对 `expo-haptics` 用法 |
| `useUiStore` 调用方式 | toast 不显示 | 实现时核对项目中其他 toast 用法 |

## 9. 验收测试策略

- **手动测试**：覆盖 AC1-AC11
- **重点路径**：
  1. 空态 → 点击 CTA → 进入 DiaryModal
  2. 有数据 Read 模式 → 点星 → 验证 quality 保存、workState 未丢
  3. 有数据 Read 模式 → 点 chip → 验证 workState 保存、quality 未丢
  4. 再次点击已选中 chip → 验证 workState 取消（null → undefined）
  5. 点击完整日记 → 打开 DiaryModal
  6. 屏幕阅读器（TalkBack/VoiceOver）遍历所有交互元素
- **回归**：运行 `pnpm run test`，确保无测试破坏
