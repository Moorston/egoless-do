## Context

当前打卡系统使用 `CheckinEntry.done: boolean` 标记完成状态，`note: string` 存储 JSON 格式的附加数据（practices、habits、water、food 等）。用户点击"完成"时直接提交，未完成项被静默忽略。

核心挑战：需要在不破坏现有打卡流程的前提下，插入一个"检测→弹窗→原因选择"环节，同时保持 Mobile 和 Web 端交互一致。

## Goals / Non-Goals

**Goals:**
- 点击"完成"时检测未完成项（practices + habits + planItems），有则弹窗
- 弹窗显示未完成列表，要求选择统一原因（6 个预设 + 补充说明）
- 原因数据持久化到 note JSON 中，向后兼容
- 打卡详情页展示原因
- 打卡统计弹窗展示月度原因分布
- Web 端交互统一为 Mobile 的"点击完成即提交"模式

**Non-Goals:**
- 不做每项单独原因
- 不做原因的自动分析或 AI 建议
- 不做原因导出
- 不修改 CheckinEntry 类型（原因存在 note JSON 中）

## Decisions

### D1: 原因存储在 note JSON 中

**选择**: 将 `incompleteReason` 和 `incompleteNote` 作为新字段加入现有 note JSON。

**理由**: CheckinEntry 类型已稳定且跨平台同步，修改类型需要 migration。note JSON 本身就是扩展性数据容器，新增字段完全向后兼容——旧版本解析时会忽略未知字段。

**替代方案**: 新增 CheckinEntry 字段 → 需要 PocketBase migration + 同步协议变更，成本过高。

### D2: 检测逻辑放在 core 层共享函数

**选择**: 在 `packages/core/src/business/checkin.ts` 中新增 `getIncompleteItems()` 函数，接收当前状态返回未完成项列表。

**理由**: Mobile 和 Web 都需要相同的检测逻辑，放在 core 层避免重复。函数纯数据操作，不依赖 UI 框架。

### D3: 弹窗 UI 各端自行实现

**选择**: 弹窗组件不在 core 层共享，Mobile 用 React Native Modal，Web 用现有 Modal 组件。

**理由**: 两端的 Modal 交互模式差异大（RN Modal vs portal-based Modal），强拆共享反而增加复杂度。核心逻辑（原因列表、提交数据）通过 core 共享即可。

### D4: Web 端去掉 Done/Not Done toggle

**选择**: Web CheckinPage 移除顶部状态 toggle 和独立提交按钮，改为底部单一"完成"按钮，行为与 Mobile 一致。

**理由**: 用户明确要求统一为 Mobile 设计。简化交互：用户不需要先选状态再提交，直接点完成即可。"未完成"状态 = 不提交（关闭页面）。

### D5: 触发时机为选择"完成"时

**选择**: 弹窗在用户点击"完成"按钮时触发，而非提交时。

**理由**: 用户明确偏好此方案。在 Mobile 端，"完成"即提交，弹窗插入在提交前；Web 端改造后同样。

### D6: 原因代码使用英文标识符

**选择**: 6 个原因使用英文 code（time/health/external/mood/forgot/other），UI 显示使用 i18n 翻译。

**理由**: 与现有 practices（sit/stand/chant）的模式一致，存储用 code，显示用翻译。

## Risks / Trade-offs

- **[向后兼容]** → 旧版本读到带 incompleteReason 的 note 不会报错（JSON.parse 忽略未知字段），但不会显示原因。可接受。
- **[Web 交互重构]** → 移除 toggle 可能影响已习惯现有流程的用户。但这是单用户应用，且新流程更简单。
- **[未完成项检测边界]** → planItems 中 auto-checked（linkedModule 自动完成的）不算未完成。需要在检测逻辑中排除。

## Implementation Notes

### 原因代码映射

```typescript
// packages/core/src/business/checkin.ts
export const INCOMPLETE_REASONS = [
  { code: 'time',     icon: '⏰' },
  { code: 'health',   icon: '🏥' },
  { code: 'external', icon: '📋' },
  { code: 'mood',     icon: '😔' },
  { code: 'forgot',   icon: '💭' },
  { code: 'other',    icon: '💬' },
] as const;

export type IncompleteReasonCode = typeof INCOMPLETE_REASONS[number]['code'];
```

### 检测函数签名

```typescript
export interface IncompleteItem {
  type: 'practice' | 'habit' | 'planItem';
  name: string;
}

export function getIncompleteItems(params: {
  practices: { sit: boolean; stand: boolean; chant: boolean };
  habits: Array<{ name: string; status: string; checkedDates: string[] }>;
  planItems: Array<{ id: string; name: string }>;
  planItemCheckins: Array<{ planItemId: string; date: string; done: boolean; linkedModule?: string }>;
  today: string;
}): IncompleteItem[]
```

### note JSON 扩展

```typescript
// buildNote 中新增
if (incompleteReason) noteData.incompleteReason = incompleteReason;
if (incompleteNote) noteData.incompleteNote = incompleteNote;
```
