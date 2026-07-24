# 架构与质量审查报告

> **日期**: 2026-07-24
> **审查范围**: `apps/mobile`、`packages/core`、`backend`、`infra/docker/api`
> **方法**: 静态指标采集（行数 / 依赖方向 / 类型安全 / 测试分布）+ 与 `AGENTS.md` 宪法逐条比对
> **关联文档**: `docs/architecture-analysis.md`、`AGENTS.md`

---

## 一、规模概览（已排除 `node_modules` / `dist`）

| 区域 | 源码行数 | 源文件数 | 测试文件数 | 备注 |
|------|---------|---------|-----------|------|
| `apps/mobile` | ~86.7k | 391 | 24 | 主力前端，screen 偏重 |
| `packages/core` | ~35k | 307 | 285 | 业务逻辑，测试比例优秀 |
| `backend`（PB hooks + migrations） | ~50.7k | — | 0 | JS hooks，零测试 |
| `infra/docker/api`（Node/Express/TS） | ~7.9k | 30（已提交） | 0 | **文档未记载** |
| **合计** | **~180k** | — | — | — |

### Core 各层分布

| 层 | 行数 |
|----|------|
| business | 6,320 |
| i18n | 4,985 |
| store | 4,776 |
| ai | 3,622 |
| types | 1,949 |
| sync | 1,364 |
| constants | 479 |
| utils | 53 |
| data | 62 |
| services | 43 |

---

## 二、架构分层评估 —— 良好 ✅

宪法 P1–P3（Core 唯一真相源 / Apps 薄壳 / 单向依赖）在源码层面**得到严格遵守**：

| 检查项 | 结果 |
|--------|------|
| `core → apps/mobile` 反向依赖 | **0 处** |
| `core → react-native / expo` | **0 处**（依赖经 `StorageAdapter` DI 注入） |
| `feature-A → feature-B` 组件直引 | **0 处** |
| `@ts-ignore` | **0** |
| `any` 泄漏 | 9 处（core）/ 21 处（mobile），可控 |
| `console.log` 残留 | 7 处 |

> 结论：分层红线守得非常好，是本项目最健康的部分，维持现状即可。

---

## 三、重大发现

### 🔴 F1：存在文档未记载的第二个后端 `infra/docker/api`

- `AGENTS.md` §1.1 / §5.1 明确「**PocketBase 唯一数据源**」，但实际仓库中存在独立的 Node/Express/TS 服务（`infra/docker/api/src`，含 `auth` / `mfa` / `rbac` / `audit-log` / `rate-limit` / `token-rotation` 等模块）。
- 该服务**已 git 提交**（30 个源文件），且由根 `package.json` 的 `pnpm api` 脚本驱动运行。
- 两套后端（PocketBase + Node API）并存，**数据归属与同步边界不清晰**，且**完全不在**宪法目录决策树（§2.1）中。

**建议**：先回答「它与 PocketBase 谁是真相源 / 各自职责边界」，再将其补进 `AGENTS.md` 与目录结构图，避免后续开发者误用。

### 🟡 F2：`AGENTS.md` 已与实际架构偏离（治理文档失真）

| 文档声称 | 实测 |
|----------|------|
| SyncEngine「拆 7 service、降至 ~200 行」 | `SyncEngine.ts` 仍为 **881 行**单体协调器（服务已拆，但主文件远超目标 <600） |
| 「32 个 slice factory」 | `store/` 下实际 **41 个** slice 文件 |
| 目录图中 schema / SyncEngine 路径 | 与实际路径不符 |

**建议**：AGENTS.md 是易过期快照，每次大重构后回归校验，或改为从代码自动生成结构图（如 `turbo` / `madge` 依赖图）。

### 🟡 F3：测试覆盖严重不平衡

- **core**：285 测试 / 307 源文件 → 比例优秀，符合 P5「复杂逻辑先测」初衷。
- **mobile**：24 测试 / 391 源文件 → UI 测试近乎空白（宪法要求 UI ≥30%，远未达）。
- **backend 与 `infra/docker/api` 均为 0 测试**，而 sync 子系统宪法要求 ≥95%。

**风险印证**：近期 commit 历史（07-24 连续多个 `fix: 咒语/经文数据持久化丢失`）显示同步/持久化层长期靠「打日志追踪」排错，正是缺测试的典型症状。

---

## 四、质量指标明细

### 4.1 超大文件（违反 §4.1 / §7.1）

- 全仓 **33 个文件 > 600 行**，**36 个文件 400–600 行**。
- TSX 页面超过 500 软限 / 800 硬限：

  | 文件 | 行数 |
  |------|------|
  | `apps/mobile/src/features/practice/body/BodyDashboard.tsx` | 1,163 |
  | `apps/mobile/src/features/plan/PlanDetailContent.tsx` | 1,026 |
  | `apps/mobile/src/features/reflections/trails/QuickCreateTrailScreen.tsx` | 972 |
  | `apps/mobile/src/features/sleep/SleepHistoryPage.tsx` | 940 |
  | `apps/mobile/src/features/reflections/core/ReflectionsScreen.tsx` | 861 |
  | `apps/mobile/src/features/exercise/SportPage.tsx` | 842 |
  | `apps/mobile/src/features/home/screens/HomeScreen.tsx` | 838 |
  | `apps/mobile/src/features/home/components/CheckinModal.tsx` | 762 |
  | `apps/mobile/src/features/practice/PreceptScreen.tsx` | 612 |

- 数据型大文件（可接受但需治理）：`i18n/{en,zh,zh-Hant}.ts` 各 ~1,280 行、`db/schema.ts` 1,224、`sync/entitySchemas.ts` 1,216、`business/plan.ts` 1,044。

### 4.2 i18n（AR-08 未完成）

- `en.ts` 1,072 key vs `zh.ts` 1,060 key → **约 12 key 漂移**（en/zh 不对齐）。
- 无编译期 key 校验，缺失翻译运行时才暴露。

### 4.3 导航（AR-04 未完成）

- `navigation/` 共 **673 行**（主 `index.tsx` 仍集中路由），超过目标上界 450。

---

## 五、优先改进建议（按性价比排序）

| # | 优先级 | 项 | 关联 | 预期收益 |
|---|--------|----|------|----------|
| 1 | 🔴 高/风险 | 澄清并补全 `infra/docker/api` 定位与文档 | F1 | 消除双后端数据归属歧义 |
| 2 | 🔴 高/质量 | 为 sync 后端、PB hooks、`mergeSyncPatch`、`orphanRecovery` 补测试 | F3 | 杜绝咒语/经文持久化丢失类事故 |
| 3 | 🟡 中/治理 | 拆分头部 TSX 巨屏（BodyDashboard / PlanDetailContent / HomeScreen / ReflectionsScreen） | §7.1 | 满足 §4.1 硬限，提升可维护性 |
| 4 | 🟡 中/治理 | 收敛 store slice（41 → 20–25） | AR-05 | 降低跨 slice 隐蔽耦合 |
| 5 | 🟢 低/一致性 | 修复 i18n 12 处 key 漂移 + 引入类型安全 key | AR-08 | 消除翻译缺失隐患 |
| 6 | 🟢 低/文档 | 刷新 AGENTS.md 与真实架构对齐 | F2 | 防止后续决策基于失真信息 |

---

## 六、结论

项目在**分层纪律与类型安全**上表现优秀（零反向依赖、零 `@ts-ignore`、极低 `any`）。主要风险集中在三处：**文档之外的第二个后端**（架构边界不清）、**sync/后端零测试**（数据安全隐患）、以及**部分 TSX 巨屏与文档失真**。建议优先处理 F1 与 F3，其余按 P6「渐进重构」逐 PR 消化。
