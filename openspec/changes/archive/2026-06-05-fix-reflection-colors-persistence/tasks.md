## 1. Mobile SyncService 修复

- [x] 1.1 在 `reflectionToSync()` 中加入 `colors` 字段（`apps/mobile/src/features/sync/SyncService.ts`）
- [x] 1.2 在 `INSERT OR REPLACE` 语句中加入 `colors` 列和对应的值
- [x] 1.3 修复保留逻辑：将 `preservedColors` 的值从 JSON 字符串 `JSON.parse` 为数组后再赋给 patch

## 2. Mobile useSync 修复

- [x] 2.1 在 `useSync.ts` 合并逻辑中增加 `typeof item.colors === 'string'` 检测，若为字符串则 `JSON.parse`

## 3. Mobile UI 防御性修复

- [x] 3.1 `ReflectionCard.tsx`：`colors` 取值前检测字符串类型并 `JSON.parse`
- [x] 3.2 `ReflectionsScreen.tsx`：内联卡片渲染处同步修复
- [x] 3.3 `ShareCard.tsx`：分享卡片渲染处同步修复

## 4. Web 端同步修复

- [x] 4.1 `apps/web/src/db/syncService.ts`：保留逻辑 JSON.parse
- [x] 4.2 `apps/web/src/components/ReflectionsTab.tsx`：UI 防御性 parseColors 辅助函数

## 5. 验证

- [x] 5.1 TypeScript 编译通过
- [ ] 5.2 手动测试：新建感念选择颜色 → 重启 APP → 颜色保留
- [ ] 5.3 手动测试：清除数据后同步恢复 → 颜色保留
- [ ] 5.4 手动测试：已有损坏数据（colors 为字符串）→ UI 正常显示
