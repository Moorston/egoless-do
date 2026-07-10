# 构建项目全局代码规范与架构约束文档

## Goal

对 egoless-do 项目进行系统性架构治理，产出两份全局性文档：

1. **全局代码规范 (`GLOBAL-CODE-STANDARDS.md`)** — 跨所有包（`packages/core`、`apps/mobile`、`infra/docker/api`、`backend/pb_hooks`）统一执行的代码质量约束
2. **架构约束 (`ARCHITECTURE-CONSTRAINTS.md`)** — 模块边界、层间依赖规则、数据流向、禁止架构模式的权威定义

这两份文档将补充现有的 `.claude/rules/` 和 `.trellis/spec/` 中已有但分散在各处的规则，形成项目级权威参考。

## Requirements

### 1. 全局代码规范文档

必须覆盖以下维度（所有包共用）：

| # | 维度 | 说明 |
|---|------|------|
| 1.1 | **类型安全** | `any` 禁令、`unknown` 优先、`as` 转型限制、`@ts-*` 指令管理 |
| 1.2 | **副作用管控** | 纯函数规则、`Date.now()`/`Math.random()` 参数化、禁止 render 中副作用 |
| 1.3 | **日志规范** | `createLogger` 统一使用、禁止 `console.log`/`console.warn` |
| 1.4 | **导入规范** | 导入顺序、禁止循环导入、禁止跨层导入（core→app） |
| 1.5 | **命名规范** | 文件/函数/类型/变量命名规则 |
| 1.6 | **错误处理** | 异常处理模式、错误边界、异步错误捕获 |
| 1.7 | **测试规范** | 测试位置、mock 模式、覆盖率目标 |
| 1.8 | **i18n 规范** | 所有用户可见字符串必须走 `t()` |
| 1.9 | **ESLint 配置同步** | 将文档中的规则同步到 `eslint.base.js` |

### 2. 架构约束文档

必须覆盖以下维度：

| # | 维度 | 说明 |
|---|------|------|
| 2.1 | **包依赖方向** | `packages/core` ← `apps/*`（核心不可反向依赖应用） |
| 2.2 | **层间边界** | Store → Business → Utils 分层职责，禁止跳过层 |
| 2.3 | **数据流** | 用户操作 → Slice → `adapter.persistChange` → WriteBatcher → SQLite → SyncEngine → PocketBase |
| 2.4 | **模块内聚** | Feature 模块自治规则、禁止跨 feature 直接引用 |
| 2.5 | **Store 契约** | 所有 Slice 必须通过 `adapter.persistChange` 持久化、`triggerSync` 触发同步 |
| 2.6 | **后端/PocketBase 边界** | `pb_hooks/` 职责、`infra/docker/api` 职责、同步协议约束 |
| 2.7 | **禁止架构模式** | 已识别或已知危险的架构反模式黑名单 |
| 2.8 | **ESLint 规则映射** | 每条约束对应具体的 ESLint/TypeScript 配置项 |

### 3. ESLint 配置增强

基于上述文档分析：

- 当前 `eslint.base.js` 缺失的规则建议（如 `no-restricted-imports` 阻止 core→app 导入）
- 可自动化的约束与需要人工 Review 的约束分类

### 4. 文档位置

产物放入 `.trellis/spec/governance/` 目录：

```
.trellis/spec/governance/
├── GLOBAL-CODE-STANDARDS.md      # 全局代码规范
├── ARCHITECTURE-CONSTRAINTS.md   # 架构约束
└── INDEX.md                      # 索引说明
```

同时更新 `.claude/rules/conventions.md` 和 `.claude/rules/architecture.md` 链接到新文档。

## Non-requirements

- ❌ 不修改源代码（纯文档产出）
- ❌ 不创建新的 ESLint 插件
- ❌ 不重构现有代码（仅记录规则）
- ❌ 不修改 CI/CD 配置

## Acceptance Criteria

- [ ] `GLOBAL-CODE-STANDARDS.md` 覆盖全部 9 个维度，每条规则清晰可执行
- [ ] `ARCHITECTURE-CONSTRAINTS.md` 覆盖全部 8 个维度，包含禁止模式黑名单
- [ ] 每条规则注明自动化程度（ESLint/TSConfig 自动 或 人工 Review）
- [ ] 文档引用现有 `.trellis/spec/` 内容作为详细参考，避免重复
- [ ] `eslint.base.js` 增强建议清单（按优先级排序）
- [ ] `INDEX.md` 阐明各文档的用途和阅读顺序
- [ ] `.claude/rules/` 相关文件添加新文档链接

## Design Decisions

- 文档语言：中文（与用户要求一致）
- 规则格式：✅ 必须 / ⚠️ 建议 / ❌ 禁止
- 每条规则附带：代码示例 + 违规示例 + 自动化程度标签
- 复杂规则附带：原理说明（为什么这条规则重要）