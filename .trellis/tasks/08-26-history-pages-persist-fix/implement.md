# Implement — 历史页数据流契约迁移

## 执行清单（有序）

### Phase 1: 补 slice action（core 层）

- [ ] 1.1 `createFastingSlice.ts` — 扩展 `FastingSlice` interface + 实现 `updateFastingNote(id, note)` 和 `deleteFastingEntry(id)`
  - 模板：预计算 → `set(() => ({ fastingHistory: newHist }))` → `adapter.persistChange('fasting', id, updated).catch(e => log.error(e))` / `adapter.markDeleted('fasting', id)`
- [ ] 1.2 `createMeditationSlice.ts` — 扩展 `MeditationSlice` interface + 实现 `updateMeditationNote(id, note)` 和 `deleteMeditationEntry(id)`
  - 注意：id 是 `entry.date`（date string）
  - delete 时重算 `totalMedMinutes`：`activeOnly(newHist).reduce((sum, e) => sum + (e.durMin || 0), 0)`
- [ ] 1.3 `createSleepSlice.ts` — 扩展 `SleepSlice` interface + 实现 `updateSleepNote(id, note)` 和 `deleteSleepEntry(id)`
  - 注意：id 是 `entry.id`（uuid）

### Phase 2: 迁移历史页（mobile 层）

- [ ] 2.1 `FastHistoryPage.tsx:198-202` — saveNote 改为 `useAppStore.getState().updateFastingNote(entry.id, noteText)`，移除 setState + flushWrites + 动态 import + console.error
- [ ] 2.2 `FastHistoryPage.tsx:301-304` — handleDelete 改为 `deleteFastingEntry(id)`
- [ ] 2.3 `MedHistoryPage.tsx:205-210` — saveNote 改为 `updateMeditationNote(entry.date, noteText)`
- [ ] 2.4 `MedHistoryPage.tsx:315-319` — handleDelete 改为 `deleteMeditationEntry(entry.date)`（slice 内部重算 totalMedMinutes，UI 不再手动算）
- [ ] 2.5 `SleepHistoryPage.tsx:198-202` — saveNote 改为 `updateSleepNote(entry.id, noteText)`
- [ ] 2.6 `SleepHistoryPage.tsx:392-396` — handleDelete 改为 `deleteSleepEntry(entry.id)`

### Phase 3: 测试

- [ ] 3.1 `createFastingSlice.test.ts` — 补 `updateFastingNote` + `deleteFastingEntry` 测试，验证 persistChange/markDeleted 被调用
- [ ] 3.2 `createMeditationSlice.test.ts` — 补 `updateMeditationNote` + `deleteMeditationEntry` 测试，验证 totalMedMinutes 重算
- [ ] 3.3 `createSleepSlice.test.ts` — 补 `updateSleepNote` + `deleteSleepEntry` 测试（该文件目前 0 测试，需新建）

### Phase 4: 验证

- [ ] 4.1 `pnpm run type-check` — 0 错误
- [ ] 4.2 `pnpm run test` — 全通过
- [ ] 4.3 `grep -rn "flushWrites\|console.error" apps/mobile/src/features/{fasting,meditation,sleep}/*HistoryPage.tsx` — 0 匹配
- [ ] 4.4 检查 `_archive/web-legacy` 是否被 type-check 扫描——若是，noopAdapter 已覆盖，无需改

## 验证命令

```bash
pnpm run type-check
pnpm run test
grep -rn "flushWrites" apps/mobile/src/features/fasting/FastHistoryPage.tsx apps/mobile/src/features/meditation/MedHistoryPage.tsx apps/mobile/src/features/sleep/SleepHistoryPage.tsx
```

## 风险点 / 回滚边界

| 风险 | 回滚 |
|------|------|
| MedHistoryEntry id 混用 date/uuid | 单元测试覆盖，git revert slice 文件 |
| markDeleted 后列表不更新 | set 已更新 Store，`!deleted` 过滤立即生效 |
| web-legacy 类型检查 | noopAdapter 已有 markDeleted，无需回滚 |

## 关键文件

- `packages/core/src/store/createFastingSlice.ts` — 改
- `packages/core/src/store/createMeditationSlice.ts` — 改
- `packages/core/src/store/createSleepSlice.ts` — 改
- `packages/core/src/store/createFastingSlice.test.ts` — 改
- `packages/core/src/store/createMeditationSlice.test.ts` — 改（新建或补）
- `packages/core/src/store/createSleepSlice.test.ts` — 新建
- `apps/mobile/src/features/fasting/FastHistoryPage.tsx` — 改
- `apps/mobile/src/features/meditation/MedHistoryPage.tsx` — 改
- `apps/mobile/src/features/sleep/SleepHistoryPage.tsx` — 改
