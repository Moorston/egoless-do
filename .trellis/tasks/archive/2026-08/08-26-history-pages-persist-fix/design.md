# Design — 历史页数据流契约迁移

## 架构与边界

```
┌─────────────────────────────────────────────────────────┐
│ mobile 层 (apps/mobile)                                  │
│  FastHistoryPage / MedHistoryPage / SleepHistoryPage    │
│    saveNote() → store.updateFastingNote(id, note)       │
│    handleDelete() → store.deleteFastingEntry(id)        │
│    （不再 setState / flushWrites / console.error）      │
└──────────────────────┬──────────────────────────────────┘
                       │ slice action 调用
┌──────────────────────▼──────────────────────────────────┐
│ core 层 (packages/core/src/store/)                      │
│  createFastingSlice / createMeditationSlice / ...        │
│    updateFastingNote(id, note):                         │
│      1. 预计算 newHist                                   │
│      2. set(() => ({ fastingHistory: newHist }))         │
│      3. adapter.persistChange('fasting', id, updated)    │
│    deleteFastingEntry(id):                               │
│      1. set(() => ({ fastingHistory: filtered }))        │
│      2. adapter.markDeleted('fasting', id)               │
└──────────────────────┬──────────────────────────────────┘
                       │ adapter 契约
┌──────────────────────▼──────────────────────────────────┐
│ mobile 层 (apps/mobile/src/store/)                      │
│  mobileStorageAdapter                                   │
│    persistChange → WriteBatcher.write (100ms) → SQLite │
│    markDeleted → registerLocalDelete + WriteBatcher    │
└─────────────────────────────────────────────────────────┘
```

## 数据契约

### 新增 action 签名

```typescript
// createFastingSlice
updateFastingNote: (id: string, note: string) => void;
deleteFastingEntry: (id: string) => void;

// createMeditationSlice
updateMeditationNote: (id: string, note: string) => void;
deleteMeditationEntry: (id: string) => void;  // 含 totalMedMinutes 重算

// createSleepSlice
updateSleepNote: (id: string, note: string) => void;
deleteSleepEntry: (id: string) => void;
```

### persistChange entity 映射

| Slice | entity 名 | id 来源 |
|-------|----------|---------|
| Fasting | `'fasting'` | `session.id`（uuid） |
| Meditation | `'meditation'` | `entry.date`（date string，见已有 `addMedMinutes`） |
| Sleep | `'sleep'` | `entry.id`（uuid，见 `createSleepSlice` 第 42 行） |

### 范式模板（对标 createPlanSlice.toggleCheckin）

```typescript
// update 范式
updateXxxNote(id: string, note: string) {
  let updated: XxxEntry | undefined;
  set(s => {
    const newHist = (s.xxxHistory ?? []).map(e =>
      e.id === id ? { ...e, note, updatedAt: Date.now() } : e
    );
    updated = newHist.find(e => e.id === id);
    return { xxxHistory: newHist };
  });
  if (updated) adapter.persistChange('xxx', id, updated).catch(e => log.error(e));
},

// delete 范式
deleteXxxEntry(id: string) {
  set(s => ({
    xxxHistory: (s.xxxHistory ?? []).filter(e => e.id !== id),
    // meditation 还要重算 totalMedMinutes:
    // totalMedMinutes: activeOnly(newHist).reduce((sum, e) => sum + (e.durMin || 0), 0)
  }));
  adapter.markDeleted('xxx', id).catch(e => log.error(e));
},
```

## 兼容性

- 新增 action 不影响已有 action（startFasting/stopFasting/addMedMinutes/saveSleepDiary 等）
- 历史页 UI 改为调用 slice action，Store 类型（`FastingSlice`/`MeditationSlice`/`SleepSlice` interface）需扩展新 action 签名
- `_archive/web-legacy/src/store/useWebStore.ts` 也组合了这些 slice——需检查是否要加 noop 实现（或类型可选）

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| MedHistoryEntry 的 id 是 date 不是 uuid，persistChange 用错 | 已在 `addMedMinutes:34` 确认 `entry.date` 作 id |
| markDeleted 后 UI 列表没立即更新 | `set` 已更新 Store，`!deleted` 过滤立即生效 |
| web legacy store 类型检查失败 | 先检查 `useWebStore.ts`，按需加 noop 或设为可选 |
| 动态 import('../../store/storageAdapter') 移除后其他地方依赖 | 仅 3 个历史页用此模式，grep 确认无其他引用 |
