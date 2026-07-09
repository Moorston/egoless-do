# Fix round 2 audit — 36 issues across sync, store, core, security

## Goal
修复第二轮审查发现的 36 项问题，分四个批次逐步实施，确保代码符合项目规范约束。

## Requirements

### 批次 A — 安全修复（CRITICAL + HIGH）
- C-2: PB 同步集合权限规则改为 `@request.auth.id = user_id`
- H14: `active_sessions`/`leaderboard` permission 规则修复
- H15: rate-limit 文档化其单实例限制
- H16: sync hooks console.error 脱敏（移除 `err.message` 中的实体细节）
- M14: API server console.error 脱敏
- M15: 活动会话 API 添加认证注释
- C-1: 添加 `.env` 历史清理说明

### 批次 B — Sync 引擎修复（HIGH + MEDIUM）
- H9/H13: 连接 `_onSyncError` → `syncStore.setSyncError`
- H10: `catch {}` → `log.error(e, { phase })`
- M9/M10: 所有空 catch 改为 `log.warn`/`log.error`
- H11: SyncResetService setState 移入 withDbLock
- H12: auto-resolve DB 写加 withDbLock
- M11: 移除 `_pendingSyncAfterInit` 死代码
- M12: `pruneStaleQueueItems` 加 await
- M13: realtime serverTime 存储（添加 onServerTime 回调）
- M8: migrateDatabase 关键操作加 withDbLock

### 批次 C — Store 一致性修复（HIGH）
- H1: createMindSlice persistChange 移出 set()
- H2: createDietSlice 所有 `get().xxx` 加 `?? []`
- H3: deletePlanItem 加入 recycleBin
- H4: ENTITY_MERGE_MAP 补充缺失实体
- H5: 文档化 soft-delete 在 pull 后的行为
- H6: initApp 将 ghost 检测与 reducer 分离
- H8: secureAuth 错误传播（re-throw）

### 批次 D — 低风险修复（MEDIUM + LOW）
- M1: createPlanSlice 无效日期守卫
- M2: createMindSlice `fearEntries`/`courageEntries` 空值保护
- M3: review.ts 函数名注释
- M4: schema.ts 索引 catch 改进（检查特定错误信息）
- M5: schema.ts user_profiles 建表加 `updated_at`/`deleted`
- M6: storageAdapter 事务注释
- M7: i18n locale 修复（检查 languageTag）
- L1-L4: 类型注释、死代码标记、内存注释

## 约束
- 必须遵循 `.trellis/spec/governance/GLOBAL-CODE-STANDARDS.md`
- 不得使用 `console.log`，统一使用 `createLogger`
- 不允许空 `catch {}`，至少加 `log.warn` 注释
- 不允许 `as any`（测试文件降至 warn）

## Acceptance Criteria
- [ ] `pnpm --filter @egoless-do/core test` — 608 测试全部通过
- [ ] `cd apps/mobile && npx tsc --noEmit` — 无新增类型错误
- [ ] 所有修改遵循全局代码规范
- [ ] 代码 review 通过（无新增空 catch、无新增 as any）