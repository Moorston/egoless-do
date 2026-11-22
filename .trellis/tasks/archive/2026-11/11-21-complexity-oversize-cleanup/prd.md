# complexity-oversize-cleanup 实施：QuickCreateTrailScreen 63 + CheckinModal 42 拆分至 ≤15

> 完整 why/what/design 见 openspec change `complexity-oversize-cleanup`（proposal.md / design.md / tasks.md）。本 prd 为执行视图。

## Goal

mobile 包 56 个 complexity warning 中仅有的 2 个超 risk-tier ≤40 豁免线函数拆分至 ≤15，ratchet 阈值 56 随动下调，零行为变更。

## Requirements

- R1 `QuickCreateTrailScreen`（CC 63 → ≤15）：三胞胎 dropdown 参数化为 `FilterDropdown`（显式 props：itemStyle 三态 / scrollable / activeColor / onClear 等，样式逐字保留）+ 互斥开闭收敛单枚举 + 按实测粒度抽 section 子组件
- R2 `CheckinModal`（CC 42 → ≤15）：lazy initializer 与 `submit` 的 noteData 装配抽 `checkinModalHelpers.ts` 纯函数（`buildPlanToggles` / `buildHabitCheckins` / `buildCheckinNoteData`），字段顺序与条件逐字保留；保留 `max-lines-per-function` 豁免注释（不拆组件）
- R3 顺带修复：QuickCreateTrailScreen 5 处硬编码中文 i18n 化（新 key 三语）
- R4 ratchet 阈值随动：`apps/mobile/package.json` `lint:complexity --max-warnings` 56 → 实测（预期 54，以跑分为准）
- R5 新增纯函数单测：`checkinModalHelpers.test.ts`（含 `buildCheckinNoteData` 快照锁定 JSON 输出）

## Constraints

- 零行为变更：对外 props / 导航参数 / store 接口 / 视觉全等（itemStyle 式逐字保留，不合并样式）
- 其余 54 个 warning 零变化（不治理 ≤40 线内存量，属制度豁免范围）
- 无组件渲染测试护航（RN 测试基建限制）——靠逐项人工复核 + 独立 commit 可回滚
- `buildCheckinNoteData` 直接决定落库 note——字段顺序/条件漂移 = 写坏数据，快照测试必须先行锁定

## Acceptance Criteria

- [x] AC1 `pnpm --filter mobile lint:complexity` 两文件显式 complexity warning 零输出（QuickCreateTrailScreen / CheckinModal / submit 均 ≤15）
- [x] AC2 全量测试 2097/2097 绿 + 新增单测全绿（2097+N）
- [x] AC3 `pnpm run type-check` 0 error（core + mobile）
- [x] AC4 `pnpm --filter mobile lint` 0 warning 维持
- [x] AC5 ratchet 压线 exit 0：阈值=实测值（56 − 消除数），且其余 warning 清单与基线 diff 仅少不减
- [x] AC6 5 处硬编码中文清零（grep `确认创建\|已选感念\|添加更多` 于 JSX 零命中）+ 新 i18n key 三语齐全
- [x] AC7 `buildCheckinNoteData` 快照测试：正常路径 / grace 模式字段跳过（water/food）/ 空 practices / customs+planItems 命名——JSON 输出逐字段断言
- [x] AC8 复核通过：原版与拆分版逐项对照（dropdown 三态样式 / 互斥行为 / onAddPress 外部置位 / noteData 字段序）

## Notes

- 背景与全景：56 warning 全景盘点结论——豁免线 ≤40 几乎不筛人（54/56 线内），治理驱动只剩 ratchet 防新增 + 主动还债任务；本任务是"必须拆"的两个头号目标
- 模式先例：④ complexity-ratchet 的 ReviewAIPanel 41→≤15（零行为变更复核 + DimensionValue 类型坑）
- `buildCheckinNote.test.ts`（core 包）是 noteData 装配的现成测试范式
