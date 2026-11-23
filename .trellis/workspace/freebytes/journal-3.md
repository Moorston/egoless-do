# Journal - freebytes (Part 3)

> Continuation from `journal-2.md` (archived at ~2000 lines)
> Started: 2026-11-20

---



## Session 111: sync-engine-complexity 实施：测试护航拆分 + risk-tier 豁免制度化

**Date**: 2026-11-20
**Task**: sync-engine-complexity 实施：测试护航拆分 + risk-tier 豁免制度化
**Branch**: `refactor/split-body-dashboard`

### Summary

SyncEngine 三超标方法沿安全语义边界拆分零行为变更：executePush 54→37（~88 行 auto-resolve 块抽 PushConflictResolver，残余进 risk-tier ≤40 豁免）/ runSync 27→≤15（ensureSyncToken 判别联合 + handleSyncError + recoverOrphansIfDue）/ executePull 41→≤15（pullOnce 4 项差异显式参数化）。策略是 characterization 先行（A 组 4 项补测锁基线 + resolver 直测 10 用例）+ 既有用例零改动全绿验证。Phase C 快路径 await 边界回归被 SyncService 并发去重测试抓住——元坑沉淀 spec Async-extraction fast-path trap；quality-guidelines 新增 Risk-Tiered Complexity Exemption（≤40）小节。全量 2097/2097 绿，type-check 0 error，lint ratchet 0，check agent 复核 8/8 AC 零缺陷。

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `0d538be9` | (see git log) |
| `6fa9cbfb` | (see git log) |
| `5a615f2d` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 112: complexity-ratchet 实施：ReviewAIPanel 拆分 + 豁免注解 + 双包 ratchet 制度化

**Date**: 2026-11-20
**Task**: complexity-ratchet 实施：ReviewAIPanel 拆分 + 豁免注解 + 双包 ratchet 制度化
**Branch**: `refactor/split-body-dashboard`

### Summary

complexity ≤15 团队约定从纸面变可执行门禁：ReviewAIPanel 主函数 41→≤15（AiResultTab 参数化三态机两 tab 共用 + TabSection.itemStyle 4 态显式参数化 + SkeletonBlock/SectionItem/PanelHeader/build 函数抽取，零行为变更）；顺带修复 4 处 as 影子强转 + 硬编码中文清零（5 新 key 三语）；PlanCreateScreen 两函数 presentational 豁免注解；双包 lint:complexity ratchet（独立 config 避开 Windows 引号问题，mobile 56 / core 37 实测起步只降不升）+ spec 双 ratchet 成文。sub-agent 三次被 API 限流（429）终止——主会话收尾半成品（DimensionValue 类型链）并完成零行为变更复核。全量 2097/2097 绿 / type-check 0 / mobile lint ratchet 0。

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `020ca795` | (see git log) |
| `1c0c7963` | (see git log) |
| `e9a139e9` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 113: coverage-ratchet-gate 实施：双包 coverage 门禁 + CI 分包化 + 三 ratchet 联动成文

**Date**: 2026-11-20
**Task**: coverage-ratchet-gate 实施：双包 coverage 门禁 + CI 分包化 + 三 ratchet 联动成文
**Branch**: `refactor/split-body-dashboard`

### Summary

双包 vitest.coverage.config.ts 落地（root:__dirname + setupFiles 绝对路径 + 分母契约，scripts 噪声不进分母）；thresholds 只锁 statements/lines（v8 all-mode 对未加载文件只有 statements 计数，branches/functions 分母随测试加载面漂移——Phase B 实测暴露的设计修正）；core 63.69 / mobile 4.62（结构性基线）实测起步只升不降；CI test job 分包 coverage 两 step 替换 verbose 双跑 + pipefail + step summary；GLOBAL-CODE-STANDARDS §9 扩为质量门禁联动（lint/complexity 只降 + coverage 只升）+ 双包 quality-guidelines 补 Coverage Ratchet 小节。AC 8/8：2097/2097 全绿 / type-check 0 / 门禁链 56/37/lint 0 不回归 / 双包 coverage 等值压线 exit 0（+1 exit 1 语义验证）。实施队列 5 项全部闭环，CI 首跑验证待 push。

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `e4160640` | (see git log) |
| `b1935268` | (see git log) |
| `d63dfb40` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 114: complexity-oversize-cleanup 完成

**Date**: 2026-11-22
**Task**: 11-21-complexity-oversize-cleanup — 拆分两个超 risk-tier ≤40 豁免线的函数至 ≤15（QuickCreateTrailScreen 63 / CheckinModal 42 主函数 + 21 submit）
**Branch**: `refactor/split-body-dashboard`

### Summary

拆分两个超 risk-tier ≤40 线的函数至 ≤15 + ratchet 阈值 56→53。核心发现：ESLint complexity 按函数分账——lazy initializer/useCallback/内联箭头是独立函数，其内部分支不计入主函数 CC（CC 落点诊断先行，已沉淀 quality-guidelines 新小节）。CheckinModal 设计期误判"纯函数提取治主函数 42"，跑分实证主函数 CC 全在 render JSX 三元 → 改走 section 子组件。门禁全绿：2112/2112 / type-check 2 successful / lint 0 / lint:complexity 53 压线 exit 0。AC 8/8。

### Main Changes

- QuickCreateTrailScreen 63→≤15：三胞胎 dropdown 参数化收敛（FilterDropdown：itemStyle 三态 / scrollable 两容器 / onClear 可选 / activeColor 差异）+ section 子组件 + i18n 六 key
- CheckinModal 42/21→≤15：checkinModalHelpers 三纯函数（buildCheckinNoteData / buildPlanToggles / buildHabitCheckins）+ characterization 测试 16 用例 + 六 section 子组件（GraceBanner / GraceSuccessOverlay / StatusButtons / SubmitButton / DataSection / ReasonModal）
- mobile lint:complexity ratchet 56→53（56−3 纯减法：三项超标退出清单）
- quality-guidelines 两新小节：CC 落点诊断先行 + 三胞胎参数化模式；ratchet 历史表更新

### Git Commits

| Hash | Message |
|------|---------|
| `4cccc3e7` | refactor(reflections) QuickCreateTrailScreen 复杂度 63→≤15 |
| `cccbdb48` | refactor(home) CheckinModal 复杂度 42/21→≤15 |
| `f14bfbb1` | build(lint) mobile lint:complexity 阈值 56→53 |
| `b7389b6f` | docs(spec) quality-guidelines 增两小节 + ratchet 56→53 |

### Testing

- 全量 2112/2112 绿（含新增 checkinModalHelpers 16 用例）
- type-check 2 successful（core+mobile）/ mobile lint 0 / lint:complexity 53 problems exit 0（阈值压线）
- AC 1-8 全过（AC8 用 git show diff 前后 400 行逐项对照等价）

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 115: sync-apply-failure-semantics

**Date**: 2026-11-24
**Task**: sync-apply-failure-semantics（openspec change，非 Trellis 任务——深挖→propose→apply 全流程）
**Branch**: `refactor/split-body-dashboard`

### Summary

增量 pull 路径（SSE realtime / fallback polling）两个实证数据完整性缺陷修复：R1 永久数据洞（apply 部分失败时 serverTime 照推 lastSyncAt → 失败实体变更被增量 pull 永久跳过）+ R2 store/SQLite 分叉（写库失败行照样进 store patch → rehydrate 后数据闪现后丢失）。D1-D5 五决策落地，SyncRealtimeController 零测试热区解冻（首测 10 用例）。

### Main Changes

- D1 全有或全无水位线：任一实体失败 → onServerTime 不推 lastSyncAt（失败实体重拉）；updateClockOffset 移出守卫（钟差校准与 apply 结果无关）
- D2 返回类型 `{ patch, failedEntities }`：ApplyResult 删除 → ApplyServerChangesResult；6 处调用方类型收紧（SyncEngine ×3 + setRealtimeApplyServerChanges + SyncRealtimeController ×3 + SyncRehydrationManager ×4 + SyncService ×2），编译器护航全命中
- D3 UpdateOutcome 判别联合：UPDATE 错误与 changes:0 区分（UPDATE 失败不走 INSERT fallback）；UNIQUE retry 后验证 changes>0 才算写成功
- D4 行级失败上升实体失败：escalateRowFailures 纯函数 + failedRows 第三返回字段；写失败行不进 applied/storeMapped
- D5 删除 connectRealtime 死参数 onKickedOut（外部链路无连锁）
- 测试 +15：characterization 12（现状快照）先行 → 修复同 commit 翻转 fixed semantics + SyncEngine D1 守卫 3
- durable 契约：quality-guidelines「Sync Apply Failure Semantics」小节

### Git Commits

| Hash | Message |
|------|---------|
| `e306b1cc` | fix(sync): 增量 pull 失败语义修复——D1-D5 五决策 |
| `4abf96f4` | docs(spec): quality-guidelines 增 Sync Apply Failure Semantics 小节 |

### Testing

- 全量 2127/2127 绿（基线 2112 + 15 新增；thought-trail daySpan 已知 flaky 单独跑绿）
- type-check 0 error / mobile lint 0 warning / lint:complexity 53 压线 exit 0
- 成功路径 byte-identical：diff 对照确认现有断言纯形式迁移（.patch. 插入 + 字段名），语义零改动

### Status

[OK] **Completed**

### Next Steps

- PR 创建被分类器故障阻塞（第三次故障，Edit 恢复但 gh 卡）——`!` 逃生命令已给用户，PR body 备好 Temp/claude/pr-body-final.md（已更新至 135 commits + sync 修复小节）
- classifier-outage-playbook memory 已更新「通道模型非窗口模型 + 逐调用判定浮动」（本次新证据：Edit 简单内容可过与 gh 卡并存）
