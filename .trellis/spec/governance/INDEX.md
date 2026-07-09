# Egoless-Do 规范文档索引

> 项目所有规范文档的入口和阅读路线
>
> **位置**: `.trellis/spec/governance/`

---

## 文档体系总览

```
.trellis/spec/
├── governance/                              ← [全局治理层 — 本文档体系]
│   ├── INDEX.md                             ← 你在这里
│   ├── GLOBAL-CODE-STANDARDS.md             ← 跨包代码规范（9 个维度）
│   └── ARCHITECTURE-CONSTRAINTS.md          ← 架构约束（8 个维度 + 禁止模式）
│
├── guides/                                  ← [思考指南]
│   ├── code-reuse-thinking-guide.md
│   └── cross-layer-thinking-guide.md
│
├── mobile/frontend/                         ← [移动端详情]
│   ├── directory-structure.md
│   ├── component-guidelines.md
│   ├── hook-guidelines.md
│   ├── state-management.md
│   ├── quality-guidelines.md
│   └── type-safety.md
│
├── core/                                    ← [Core 包详情]
│   ├── frontend/
│   │   ├── directory-structure.md
│   │   ├── component-guidelines.md
│   │   ├── hook-guidelines.md
│   │   ├── state-management.md
│   │   ├── quality-guidelines.md
│   │   └── type-safety.md
│   └── backend/
│       ├── directory-structure.md
│       ├── error-handling.md
│       ├── logging-guidelines.md
│       ├── database-guidelines.md
│       └── quality-guidelines.md
│
└── config/frontend/                         ← [Config 包详情]
    ├── directory-structure.md
    ├── component-guidelines.md
    ├── hook-guidelines.md
    ├── state-management.md
    ├── quality-guidelines.md
    └── type-safety.md
```

---

## 阅读路线

### 如果你是：新加入开发者

1. **先读** `.claude/rules/` → 项目整体认知（架构、模块、技术栈）
2. **再读** `GLOBAL-CODE-STANDARDS.md` → 全局代码规范
3. **再读** `ARCHITECTURE-CONSTRAINTS.md` → 架构约束和禁止模式
4. **参考** 对应包的 `.trellis/spec/<包>/` → 细节规范

### 如果你是：AI 编码助手

1. 每条任务开始前加载 `GLOBAL-CODE-STANDARDS.md` 和 `ARCHITECTURE-CONSTRAINTS.md`
2. 编辑代码时优先遵守 🔴 MUST 规则
3. 产出后自查是否符合所有约束

### 如果你是：Code Reviewer

1. Review checklist 优先检查 ARCHITECTURE-CONSTRAINTS.md 第 8 节的禁止模式黑名单
2. 确认新代码未引入任何 🔴 P0 或 🔴 P1 模式
3. 确认新代码遵守包依赖方向和层间边界的 🔴 MUST 规则

### 如果你是：架构师

1. 架构决策需在 `ARCHITECTURE-CONSTRAINTS.md` 中记录
2. 新增禁止模式需更新黑名单
3. ESLint 配置变更需同步更新 `GLOBAL-CODE-STANDARDS.md` 第 9 节

---

## 文档关系图

```
┌──────────────────────────────────────────────────────┐
│                  项目入口                             │
│  .claude/rules/ + CLAUDE.md                          │
├──────────────────────────────────────────────────────┤
│                        │                              │
│          ┌─────────────┴─────────────┐               │
│          ▼                            ▼               │
│  GLOBAL-CODE-STANDARDS     ARCHITECTURE-CONSTRAINTS   │
│  (跨包代码规范)               (架构约束 + 禁止模式)     │
│          │                            │               │
│          └─────────────┬─────────────┘               │
│                        ▼                              │
│          ┌─────────────────────────┐                  │
│          │   包内详细规范            │                  │
│          │  .trellis/spec/<包>/     │                  │
│          └─────────────────────────┘                  │
└──────────────────────────────────────────────────────┘
```

---

## 快速链接

| 文档 | 链接 | 内容概要 |
|------|------|---------|
| 全局代码规范 | [GLOBAL-CODE-STANDARDS.md](./GLOBAL-CODE-STANDARDS.md) | 9 维度代码标准，含示例和 ESLint 映射 |
| 架构约束 | [ARCHITECTURE-CONSTRAINTS.md](./ARCHITECTURE-CONSTRAINTS.md) | 8 维度架构规则 + 禁止模式黑名单 |
| 移动端规范 | [mobile/frontend/](../mobile/frontend/index.md) | 移动端目录结构、组件、Hook、状态管理 |
| Core 规范 | [core/backend/](../core/backend/index.md) | Core 包数据层规范 |
| 思考指南 | [guides/](../guides/index.md) | 跨层思考、代码复用 |

---

> **更新记录**: 2026-07-09 — 初始版本
> **维护者**: `freebytes`