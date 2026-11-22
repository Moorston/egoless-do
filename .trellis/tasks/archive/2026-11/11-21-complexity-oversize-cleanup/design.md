# Design — complexity-oversize-cleanup（执行视图）

> 完整解剖与决策依据见 openspec change `complexity-oversize-cleanup/design.md`。本文件只记执行要点与验证方式。

## 拆分语义总表

| 函数 | 形态 | 拆法 | 为什么这样拆 |
|---|---|---|---|
| QuickCreateTrailScreen 63 | UI 同构拷贝（3 dropdown ≈ 36 CC）+ 12 个条件 section | ①参数化组件收敛 ②section 抽同文件模块级子组件 | 同构拷贝参数化消重；逻辑层已健康（08-26 已拆 useQuickTrailSearch） |
| CheckinModal 主函数 42 + submit 箭头 21 | ~~纯函数提取即可~~（**Execute 期证伪**：lazy initializer 与 submit 装配都在独立回调内，本就不贡献主函数 CC——42 全在 render JSX 的三元/&&/??） | ①submit 装配 + 三 initializer 纯函数提取（治 submit 21→~6）②**主函数 render section 抽同文件子组件**（见 D6） | 纯函数提取只治第二个超标函数；主函数按 QuickCreateTrailScreen 同款 section 抽取。误判发现于 3.3 实施前跑分确认（`--rule complexity` 报 L28 主函数 42 / L122 submit 21） |

## 关键设计点（实施时必须逐字遵守）

### D1 FilterDropdown 显式 props（不接受推断）

```
triggerLabel / isActive / options / activeKeys / onToggle / onClear? /
activeColor / itemStyle('plain'|'checkbox'|'checkboxMood') / scrollable /
isOpen / onOpenChange
```

- `itemStyle` 三态：`checkbox` 与 `checkboxMood` 是两个同名不同值的 StyleSheet key——**逐字保留不合并**
- `activeColor`：标签用 `TH.primary`，心情用 `#8B5CF6`——逐字
- `scrollable`：时间 dropdown 用固定菜单（`dropdownMenu`），标签/心情用 `dropdownMenuScrollable`（maxHeight 240 + ScrollView）——逐字
- 时间 dropdown 无"全部"清空项（`onClear` 不传）；标签/心情有——逐字
- 心情 item 是 `getMoodIcon(mood) + mood`，标签 item 纯文本——renderItem 差异通过 options 的 icon 字段携带

### D2 互斥开闭单枚举

```ts
type OpenDropdown = 'time' | 'tags' | 'moods' | null;
```

5 处归口：3 个 trigger onPress + backdrop + onScrollBeginDrag；**外部置位** `onAddPress`（FilterTags 的 L515）映射 `setOpenDropdown('time')`。

### D3 buildCheckinNoteData 输入显式列全（14 项）

note / waterMl / isGraceMode / practices / habitCheckins / habits / dailyCustomTodos / todayPlanItems / planToggles / planCheckins / totalCal / reasonOverride / reasonNoteOverride / targetDate

**字段顺序与赋值条件逐字保留**（JSON.stringify 输出逐字节可比）：

```
note（if note）→ water（if !isGraceMode && waterMl>0）→ practices（3 if + if pr.length）→
habits（filter checked → map name → filter(Boolean) → if length）→
customs（dailyCustomTodos.filter(done).map(name) → if length）→
planItems（filter(planToggles ?? planCheckins 查证).map(name) → if length）→
food（if !isGraceMode && totalCal>0）→
incompleteReason（if reasonOverride）→ incompleteNote（if reasonNoteOverride?.trim()）
```

### D6 CheckinModal 主函数 section 抽取（D3 证伪后的补救拆法）

主函数 42 的分支全在 render JSX——抽同文件子组件，JSX 逐字搬运，外层条件内聚：

| 子组件 | 原行号 | 收走的分支 |
|---|---|---|
| GraceBanner | L312-324 | `isGraceMode && !graceSuccess`（2） |
| GraceSuccessOverlay | L326-341 | `graceSuccess ? :`（1） |
| StatusButtons | L345-371 | `!isGraceMode &&` + localDone===false ×3 + localDone===true ×3（7） |
| PracticesSection | L380-403 | 0（map 回调独立）——**不抽**（纯体积无分支收益） |
| 列表三段（PlanItems/CustomTodos/Habits） | L405-445 | 各 `length > 0 &&`（3）——按实测决定是否抽 |
| SubmitButton | L447-461 | `!isGraceMode &&` + localDone 三态嵌套三元 ×4（5） |
| DataSection（weight/water/food） | L464-560 | 标题/边框/单位/显隐三元 ×7（7） |
| ReasonModal | L599-670 | disabled `||` + 确认按钮 `&& ?:`（3） |

先抽大件（ReasonModal / DataSection / StatusButtons / SubmitButton / GraceBanner / GraceSuccessOverlay ≈ 25），跑分后按实测补列表三段。max-lines-per-function 豁免注释保留（多段对话框单滚动仍是实情）。

### D4 阈值随动流程

跑 `pnpm --filter mobile lint:complexity` 拿实测 → 填 package.json 阈值 → 复跑压线 exit 0。**不预先写死预期数字**（④ 教训：预估 39 实测 37，以实测为准）。

### D5 i18n key 命名

`quickTrailConfirmCreate` / `quickTrailTagsLabel` / `quickTrailMoodsLabel` / `quickTrailSelectedMoods` / `quickTrailAddMore`——沿用 `quickTrail*` 前缀，插 types.ts 既有分组（L484-488 区域附近）。

## 验证矩阵

| 验证 | 方式 | 通过标准 |
|---|---|---|
| 复杂度 | 两文件显式 `--rule complexity` | 零 warning |
| 行为等价（UI） | 逐项人工对照表（dropdown 三态/互斥/外部置位/样式逐字） | 全等 |
| 行为等价（noteData） | 快照测试 + 字段序断言 | 逐字节 |
| 回归 | 全量 vitest + type-check + lint + lint:complexity | 2097+N 绿 / 0 / 0 / 压线 exit 0 |
| 可回滚 | 5 批独立 commit | 每批单独 revert 后门禁仍绿 |

## 风险与缓解（浓缩）

- **noteData 漂移写坏数据**（最高危）→ 快照先行 + 字段序逐字 + grace 分支单独断言
- **无渲染测试护航** → 逐字保留纪律 + 独立 commit + 人工对照表
- **阈值估错** → 实测填入，不预估
