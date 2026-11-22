# Implement — complexity-oversize-cleanup

> 每 Phase 末尾门禁（全部通过才进下一 Phase）：
> ```bash
> pnpm exec vitest run                       # 全量 2097+N 绿
> pnpm run type-check                        # 0 error
> pnpm --filter mobile lint                  # 0 warning
> ```
> 回滚点：每 Phase 独立 commit，任一可单独 revert。

## Phase 0 — 基线快照

- [x] 0.1 记录 56 warning 清单基线（`pnpm --filter mobile lint:complexity` 输出存档）
- [x] 0.2 全量测试绿基线（2097/2097；thought-trail daySpan 偶发 flaky 复跑两次为准）

## Phase 1 — FilterDropdown 参数化（R1 主战场）

- [x] 1.1 新建 `apps/mobile/src/features/reflections/trails/FilterDropdown.tsx`（design D1 props 全集）
- [x] 1.2 QuickCreateTrailScreen 三处 dropdown 替换（时间 L330-370 / 标签 L373-438 / 心情 L440-507）
- [x] 1.3 互斥开闭单枚举收敛（design D2）：3 trigger + backdrop + onScrollBeginDrag + onAddPress 六处归口
- [x] 1.4 逐项对照表：itemStyle 三态 / activeColor / scrollable 两容器 / onClear 有无 / icon 渲染——全等
- [x] 1.5 门禁 + 独立 commit

## Phase 2 — QuickCreateTrailScreen section 抽取 + i18n（R1+R3）

- [x] 2.1 跑分：Phase 1 后主函数 CC——已 ≤15 则 section 只抽体积最大两项（CreationPanel / MatchResults），否则按全清单
- [x] 2.2 抽同文件模块级子组件：CreationPanel / MatchResults / PreviewSection / empty state（按 2.1 决定的粒度）
- [x] 2.3 i18n 5 key 三语（design D5 命名）：替换 L216/L386/L453/L579/L586 五处硬编码
- [x] 2.4 门禁 + `--rule complexity` 两文件零输出 + 独立 commit

## Phase 3 — CheckinModal 纯函数提取（R2）

- [x] 3.1 新建 `checkinModalHelpers.ts`：buildPlanToggles / buildHabitCheckins / buildCheckinNoteData（design D3 输入 14 项全集，字段序逐字）
- [x] 3.2 `checkinModalHelpers.test.ts`：快照锁定 JSON 输出 + grace 字段跳过（water/food）+ 空 practices + customs/planItems 命名 + 三组 initializer 各自用例
- [x] 3.3 CheckinModal 替换 lazy initializer + submit noteData 装配（豁免注释保留）
- [x] 3.4 跑分：主函数 ≤15 / submit ≤15；超了再抽 handleDone 的 getIncompleteItems 装配（按实测决定）
- [x] 3.5 门禁 + 独立 commit（test 与 refactor 同批：测试先行护航提交顺序）

## Phase 4 — 阈值随动 + 全量验收（R4 + AC 全量）

- [x] 4.1 跑分实测 → `apps/mobile/package.json` 阈值 56 → 实测值 → 复跑压线 exit 0
- [x] 4.2 其余 warning 清单 diff 基线：只少这 2 项，无新增
- [x] 4.3 AC 1-8 逐条核对（prd.md）+ 独立 commit

## Phase 5 — 收尾（workflow Phase 3）

- [ ] 5.1 spec update（quality-guidelines：三胞胎参数化模式 + 纯函数提取模式——若与既有章节重复则只补 delta）
- [ ] 5.2 `openspec archive complexity-oversize-cleanup --yes`
- [ ] 5.3 changelog 更新 + task archive + journal（finish-work）

## 已知坑（前期实测）

- grep 统计 complexity 输出双计坑（Message 与 ruleId 各含 complexity）——用 rule 精确分组
- RN `width: '80%'` 字面量抽参数必须 `DimensionValue`（④ 实测）
- 无组件渲染测试——每 Phase 末尾逐项人工对照表是唯一行为等价保障
- `lint:complexity` 阈值以实测填入（④ 预估 39 实测 37 教训）
