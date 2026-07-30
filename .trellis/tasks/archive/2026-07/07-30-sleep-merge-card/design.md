# 调眠页昨晚睡眠卡片与快速记录合并 — 技术设计

## 1. 概述

将 HomePage 中分离的 SleepSummaryCard（只读）和 QuickDiary（只写）合并为单个内联编辑组件 `SleepSummaryCard`，支持只读态/编辑态切换。

## 2. 组件架构

### 2.1 文件结构

```
apps/mobile/src/features/sleep/
  ├── HomePage.tsx                    ← 修改：删除旧卡片，引用新组件
  ├── SleepSummaryCard.tsx            ← 新建：合并后的内联编辑卡片
  ├── SleepEngine.tsx                 ← 不变：props 传递已满足需求
  ├── DiaryModal.tsx                  ← 不变：完整日记仍独立
  └── sleepStyles.ts                  ← 可能新增少量样式
```

### 2.2 组件树

```
SleepEngine
  └── HomePage
        ├── SleepSummaryCard (新)     ← 合并后的卡片
        │     ├── 只读态
        │     │     ├── 时长 + 质量★ + 工作状态标签
        │     │     ├── 入睡/起床时间 + 仪轨 + 感恩
        │     │     └── ✎ 编辑按钮
        │     ├── 空态
        │     │     └── 整行可点提示
        │     └── 编辑态
        │           ├── 质量★ 选择
        │           ├── 工作状态 chips
        │           ├── 保存/取消按钮
        │           └── 完整日记 →
        ├── BodyClockCard (不变)
        ├── SleepGoalCard (不变)
        ├── TrendChart (不变)
        └── ...
```

## 3. 数据流

### 3.1 Props 接口

```ts
// SleepSummaryCard.tsx
interface SleepSummaryCardProps {
  todaySleep: SleepEntry | null | undefined;
  onSaveQuickDiary: (quality: number, workState?: WorkState) => void;
  onOpenFullDiary: () => void;
}
```

### 3.2 状态管理

```ts
// 组件内部状态
const [editing, setEditing] = useState(false);
const [draftQuality, setDraftQuality] = useState(0);
const [draftWorkState, setDraftWorkState] = useState<WorkState | null>(null);
```

- **进入编辑态**：从 `todaySleep` 预填 `draftQuality` / `draftWorkState`
- **保存**：调用 `onSaveQuickDiary(draftQuality, draftWorkState)` → 成功则 `setEditing(false)`
- **取消**：`setEditing(false)`，草稿自动丢弃（下次进入重新从 todaySleep 读取）

### 3.3 数据流图

```
┌─────────────────────────────────────────────────────────────┐
│                      SleepEngine                            │
│  todaySleep = getTodaySleep()                               │
│  onSaveQuickDiary = (q, ws) => saveSleepDiary({q, ws})      │
│  onSetShowDiary = (v) => setShowDiary(v)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ props
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      HomePage                               │
│  <SleepSummaryCard                                          │
│    todaySleep={todaySleep}                                  │
│    onSaveQuickDiary={onSaveQuickDiary}                      │
│    onOpenFullDiary={() => onSetShowDiary(true)}             │
│  />                                                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  SleepSummaryCard                           │
│                                                             │
│  ┌─────────────┐  点击 ✎    ┌──────────────┐               │
│  │  只读态      │ ────────► │  编辑态       │               │
│  │             │           │              │               │
│  │  展示数据    │ ◄──────── │  草稿编辑     │               │
│  └─────────────┘  保存/取消 └──────────────┘               │
│        │                              │                     │
│        │                              ▼                     │
│        │                   onSaveQuickDiary(q, ws)          │
│        │                              │                     │
│        │                              ▼                     │
│        │                   store.saveSleepDiary()           │
│        │                              │                     │
│        ◄──────────────────────────────┘                     │
│        store 更新 → todaySleep 重渲染                        │
└─────────────────────────────────────────────────────────────┘
```

## 4. 状态机

```
                    ┌──────────────────────┐
                    │      初始化           │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
           ┌───────│     todaySleep       │───────┐
           │       │      有数据?          │       │
           │       └──────────────────────┘       │
           │                                      │
           ▼                                      ▼
┌─────────────────────┐              ┌─────────────────────┐
│    READ_MODE        │              │    EMPTY_STATE       │
│   (只读展示态)       │              │    (空态)            │
│                     │              │                     │
│  · 时长/质量★       │              │  · 提示文案          │
│  · 工作状态标签      │              │  · 整行可点          │
│  · ✎ 编辑按钮       │              │                     │
└─────────┬───────────┘              └─────────┬───────────┘
          │                                    │
          │ 点击 ✎                             │ 点击整行
          │                                    │
          ▼                                    ▼
┌─────────────────────────────────────────────────────────┐
│                    EDIT_MODE (编辑态)                    │
│                                                         │
│  · 质量★ 选择 (从 todaySleep.quality 预填)              │
│  · 工作状态 chips (从 todaySleep.workState 预填)        │
│  · 保存按钮 (quality>0 时可用)                          │
│  · 取消按钮                                             │
│  · 完整日记 →                                          │
└─────────────────────────────┬───────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
          点击保存        点击取消        点击完整日记
              │               │               │
              ▼               │               ▼
     onSaveQuickDiary()       │         onOpenFullDiary()
              │               │               │
              ▼               │               │
      ┌──────────────┐        │               │
      │ 保存成功?     │        │               │
      └──────┬───────┘        │               │
    成功     │         失败    │               │
     │      │         │      │               │
     ▼      │         ▼      │               │
  回到只读  │      toast提示  │               │
  态展示   │      保留编辑态  │               │
     │      │         │      │               │
     └──────┴─────────┴──────┘               │
                    │                        │
                    └────────────────────────┘
                              │
                              ▼
                    关闭 DiaryModal
                    (若数据变化则只读态刷新)
```

## 5. UI 布局

### 5.1 只读态（有数据）

```
┌──────────────────────────────────────────┐
│ 昨晚睡眠                           ✎ 编辑  │  ← 标题行
│                                          │
│  7h30m              ★★★★☆              │  ← 时长 + 质量
│  🛌 23:00  ☀️ 06:30   精神饱满          │  ← 时间 + 工作状态
│  ✅ 仪轨  ·  感恩 ×2                     │  ← 仪轨 + 感恩
└──────────────────────────────────────────┘
```

### 5.2 空态（无数据）

```
┌──────────────────────────────────────────┐
│ 昨晚睡眠                                  │
│                                          │
│   ☆☆☆☆☆  点星记录昨晚睡眠 →             │  ← 整行可点
│   睡得怎么样？开始记录吧                   │
│                                          │
└──────────────────────────────────────────┘
```

### 5.3 编辑态

```
┌──────────────────────────────────────────┐
│ 昨晚睡眠                          ✕ 取消  │
│                                          │
│  7h30m              ★★★★☆  ← 可点       │  ← 时长 + 质量选择
│  🛌 23:00  ☀️ 06:30                     │  ← 时间（不可编辑）
│                                          │
│  工作状态                                │  ← 工作状态标签
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│  │精神│ │正常│ │疲惫│ │筋疲│           │  ← chips
│  └────┘ └────┘ └────┘ └────┘           │
│                                          │
│  ┌──────────────┐                       │
│  │   保 存      │                       │  ← 保存按钮
│  └──────────────┘                       │
│                                          │
│  完整日记 →                              │  ← 完整日记入口
└──────────────────────────────────────────┘
```

## 6. 关键实现细节

### 6.1 进入编辑态逻辑

```ts
const enterEditMode = () => {
  setDraftQuality(todaySleep?.quality ?? 0);
  setDraftWorkState(todaySleep?.workState ?? null);
  setEditing(true);
};
```

### 6.2 保存逻辑

```ts
const handleSave = () => {
  if (draftQuality === 0) return; // 按钮已禁用，双重保险
  try {
    onSaveQuickDiary(draftQuality, draftWorkState ?? undefined);
    setEditing(false); // 保存成功，回到只读态
  } catch (e) {
    // 保存失败，保留编辑态，显示 toast
    log.error('SleepSummaryCard save failed', e);
    // TODO: 显示 toast（项目若无 toast 组件则用 Alert）
  }
};
```

### 6.3 取消逻辑

```ts
const handleCancel = () => {
  setEditing(false);
  // 草稿自动丢弃，无需手动清空
};
```

### 6.4 工作状态 chips 渲染

```ts
const WORK_STATE_OPTIONS: { key: WorkState; labelKey: string }[] = [
  { key: 'energetic', labelKey: 'sleepWorkEnergetic' },
  { key: 'normal',    labelKey: 'sleepWorkNormal' },
  { key: 'tired',     labelKey: 'sleepWorkTired' },
  { key: 'exhausted', labelKey: 'sleepWorkExhausted' },
];
```

### 6.5 保存失败处理

项目当前无通用 toast 组件，建议：
- **首选**：使用 `Alert.alert` 显示错误（与项目其他模块一致）
- **备选**：引入 `react-native-toast-message`（但增加依赖，不推荐）

## 7. HomePage 改动

### 7.1 删除内容

- 原 SleepSummaryCard JSX（136-186 行）
- 原 QuickDiary JSX（247-279 行）
- `quickQuality` / `quickWorkState` / `handleQuickSave` 状态和处理函数（114-130 行）
- `WORK_STATE_OPTIONS` 常量（125-130 行，移入新组件）

### 7.2 新增内容

```tsx
import SleepSummaryCard from './SleepSummaryCard';

// 在 ScrollView 中替换原来的两个卡片
<SleepSummaryCard
  todaySleep={todaySleep}
  onSaveQuickDiary={onSaveQuickDiary}
  onOpenFullDiary={() => onSetShowDiary(true)}
/>
```

### 7.3 Props 传递

SleepEngine 已提供 `onSaveQuickDiary` 和 `onSetShowDiary`，无需修改 SleepEngine。

## 8. 样式设计

### 8.1 新增样式（sleepStyles.ts）

```ts
// SleepSummaryCard 专用样式
summaryCard: { /* 复用现有卡片样式 */ },
summaryHeader: { /* 标题行 */ },
summaryEditBtn: { /* 编辑按钮 */ },
summaryDuration: { /* 时长大字 */ },
summaryStars: { /* 星星行 */ },
summaryTimeRow: { /* 时间行 */ },
summaryWorkStateLabel: { /* 工作状态标签 */ },
summaryEmptyState: { /* 空态容器 */ },
summaryChipsRow: { /* chips 行 */ },
summaryChip: { /* 单个 chip */ },
summarySaveBtn: { /* 保存按钮 */ },
summaryCancelBtn: { /* 取消按钮 */ },
summaryFullDiaryLink: { /* 完整日记链接 */ },
```

### 8.2 复用原则

- 卡片容器：圆角 20、边框 1px `TH.border`、内边距 20、背景 `TH.card`
- 星星颜色：`#F59E0B`（与现有一致）
- chip 样式：与 DiaryModal 的 chip 风格一致

## 9. 边界情况处理

| 场景 | 处理方式 |
|------|---------|
| 保存时 store 抛异常 | catch → Alert 提示 → 保留编辑态 |
| 编辑态中 todaySleep 变化 | 不响应（编辑态内以草稿为准） |
| 完整日记修改后关闭 | 只读态自动刷新（store 订阅） |
| 用户把星星从 4 改回 0 | 保存按钮禁用，只能取消 |
| 工作状态未选 | 允许保存（workState 可选） |
| 快速连续点击保存 | 不处理防重（store 写入很快） |

## 10. 测试策略

### 10.1 手动测试清单

- [ ] 有数据时只读态展示正确（时长、质量、工作状态）
- [ ] 无数据时空态展示正确，点击进入编辑态
- [ ] 编辑态星星预填正确
- [ ] 编辑态工作状态预填正确
- [ ] 点击星星更新 draftQuality
- [ ] 点击 chip 更新 draftWorkState（单选切换）
- [ ] quality=0 时保存按钮禁用
- [ ] quality>0 时保存按钮可用
- [ ] 点击保存 → store 更新 → 回到只读态
- [ ] 点击取消 → 数据不变 → 回到只读态
- [ ] 点击完整日记 → DiaryModal 打开
- [ ] DiaryModal 关闭后数据刷新

### 10.2 自动化测试（可选）

- 单元测试：`SleepSummaryCard.test.tsx` 测试状态切换逻辑
- 集成测试：HomePage + SleepSummaryCard 交互流程

## 11. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 新组件 bug 影响首屏 | 高 | 独立文件，可一键回滚到旧双卡片 |
| 保存失败无反馈 | 中 | Alert + 保留编辑态 |
| 工作状态展示让卡片变高 | 低 | 最多 +24px，可接受 |
| 编辑态切换动画缺失 | 低 | 条件渲染足够，动画是 enhancement |

## 12. 后续优化（不在本次范围）

- 跨天/补录场景支持
- 卡片内编辑入睡/起床时间
- 编辑态切换动画（参考 ExerciseCard）
- 工作状态快捷编辑（长按只读态标签直接进入编辑态）
