# 调眠页 i18n 硬编码清理

> 本次是整个「调眠页后续优化（P0-P3）」任务的**全部范围**——修复调眠功能中所有中文硬编码，补全 i18n 覆盖。

## Goal

调眠页所有用户可见文案均通过 `T()` 翻译函数输出，做到：
1. 切换语言时调眠页能完整展示对应语种
2. 消除所有 `|| '中文'` 兜底硬编码
3. 建立"硬编码 → i18n key"的清晰映射

## Background

- 调眠页视觉反馈已较完整（保存动画、趋势图、睡前提醒脉冲等），但文案层 i18n 覆盖不完整。
- 应用 i18n 基础设施健全：`packages/core/src/i18n/`，zh / en / zh-Hant 三语种，`T()` 函数 + TypeScript types 约束。
- 部分 i18n key 已存在于字典但未被对应 UI 使用（用了 `|| '中文'` 兜底），说明之前尝试过 i18n 但没做完。

## Confirmed Facts（来自代码探查）

以下文件存在中文硬编码（未通过 `T()` 翻译）：

| 文件 | 硬编码数量（估） | 备注 |
|------|-----------------|------|
| `DiaryModal.tsx` | ~10 | 有对应 key 但用 `\|\| '中文'` 兜底（`sleepBodyState`/`sleepMindState`/`sleepCustomTag`/`sleepAddTag`/`sleepNote`） |
| `SleepGratitudePage.tsx:78,108` | 2 | "今晚睡得怎么样？"、"今日感悟（可选）" |
| `SleepReportPage.tsx:111,127,145` | 4 | "睡眠质量"、"修行记录"、"连续天数"、"回到首页" |
| `SleepHistoryPage.tsx` | ~10 | 统计卡标签、热力图标题、空态引导等 |
| `HomePage.tsx:213,225` | 2 | "调眠仪轨"、"快速感恩" |

i18n 字典中**已定义但疑似未使用**的 key：`sleepWeekAvg`, `sleepDebt`, `sleepReminder`, `sleepBarrierUsage`, `sleepBedtime`/`sleepWakeTime`, `sleepMorningThought`/`sleepMorningPlaceholder`, `sleepStep3`, `sleepBarrierSelect`/`sleepBarrierMin15/20/30`, `sleepPracticeDone`, `sleepBreathGlow`, `sleepBodyClock`, `sleepCurrentPeriod`。

## Default Decisions（默认决策，不同意请喊停）

| 决策点 | 默认 | 反悔方式 |
|--------|------|---------|
| 范围 | **仅调眠页**，不推广到其他 feature | 告诉我"顺便做 XX" |
| 语种 | **zh + en 必补；zh-Hant 若 key 已存在则顺手补，否则只补 zh+en** | 告诉我"只做 zh+en" 或"三语种都要" |
| 字典未使用 key | **保留不动**（本次不清理字典，避免破坏其他引用） | 告诉我"顺手删" |
| 硬编码 → key 映射 | 优先**复用已有 key**；没有合适 key 时**新增**，命名遵循 `sleep` + 语义驼峰 | 告诉我命名偏好 |
| `|| '中文'` 兜底 | 改为 `|| T('key')` 或直接 `T('key')`（视字典是否已含该文案） | — |
| 验收方式 | 代码审查 + `grep` 扫描调眠目录确认无残留硬编码（排除 i18n 字典文件本身） | — |

## Requirements

- [ ] 所有调眠页用户可见中文文案通过 `T()` 输出
- [ ] 新增 i18n key 同步写入 `zh.ts` + `en.ts`（+ `zh-Hant.ts` 若该 key 已存在）
- [ ] 新增 key 同步更新 `types.ts` 的 `TranslationKey` 联合类型
- [ ] 不破坏现有功能（纯文案替换，不改逻辑）

## Acceptance Criteria

- [ ] `grep -nE '[\x{4e00}-\x{9fff}]' apps/mobile/src/features/sleep/ packages/core/src/i18n/<filename>` 扫描（排除字典文件）**无新增硬编码行**
- [ ] 切换英文后调眠页所有文案显示为英文（或对应语种），无中文残留
- [ ] 切换回中文后显示正常
- [ ] 现有测试通过（`pnpm run test`）
- [ ] TypeScript 编译无新增错误（`pnpm run type-check`）

## Out of Scope

- 视觉动效 / 布局重构
- 睡眠阶段（REM/深睡/浅睡）数据模型扩展
- 其他 feature 的 i18n 清理
- 字典中已有未使用 key 的删除

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
