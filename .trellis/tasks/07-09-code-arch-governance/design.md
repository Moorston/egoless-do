# 设计文档 — 全局代码规范与架构约束

## 1. 文档体系设计

### 1.1 三层文档架构

```
.trellis/spec/
├── governance/                    # [新增] 全局治理层
│   ├── INDEX.md                   # 索引和阅读路线
│   ├── GLOBAL-CODE-STANDARDS.md   # 跨包代码规范
│   └── ARCHITECTURE-CONSTRAINTS.md# 架构约束
├── guides/                        # [已有] 思考指南
├── mobile/frontend/               # [已有] 移动端规范
├── core/backend/                  # [已有] core 包规范
├── core/frontend/                 # [已有] core 前端规范
└── config/frontend/               # [已有] config 包规范
```

### 1.2 关系定位

| 文档 | 粒度 | 受众 | 与现有文档关系 |
|------|------|------|---------------|
| `GLOBAL-CODE-STANDARDS.md` | 项目全局 | 所有开发者/AI | 聚合 + 补充 `.claude/rules/conventions.md` |
| `ARCHITECTURE-CONSTRAINTS.md` | 模块间 | 架构师/Reviewer | 聚合 + 补充 `.claude/rules/architecture.md` |
| 现有 `.trellis/spec/*` | 包内 | 该包开发者 | 作为详细参考被新文档引用 |

## 2. 规则分类法

每条规则标注三个属性：

### 2.1 强制等级
- **🔴 MUST** — 违反即产生 bug 或架构违规（自动化检查）
- **🟡 SHOULD** — 违反降低可维护性，建议修复（lint warning）
- **🟢 MAY** — 团队约定，无自动化检查

### 2.2 自动化程度
- **🤖 Auto** — ESLint/TSConfig 可自动检测或修复
- **👁 Manual** — 需要人工 Code Review

### 2.3 适用范围
- `core` — `packages/core`
- `mobile` — `apps/mobile`
- `api` — `infra/docker/api`
- `pb` — `backend/pb_hooks`
- `ALL` — 所有包

## 3. 核心约束来源

从代码库现有分析中提取的关键约束：

### 3.1 包依赖方向
```
infra/docker/api  ←  (REST)  →  PocketBase
       ↓                            ↓
packages/core  ←─── (REST) ────  PocketBase SDK
       ↓
apps/mobile (consumes core types + slice factories)
```

**绝对禁止**：
- `packages/core` 引用 `apps/*`（会导致循环依赖）
- `packages/core` 包含 RN/Expo 导入

### 3.2 数据流
```
用户操作 → Screen/Component
              ↓ (调用 slice action)
         Slice Factory (set + get)
              ↓
    ┌─────────┴─────────┐
    ↓                    ↓
  adapter.persistChange   triggerSync()
    ↓                      ↓
  WriteBatcher (100ms)    SyncEngine
    ↓                      ↓
  SQLite                  PocketBase
```

### 3.3 Store 契约
每个 `createXxxSlice` 工厂签名：
```typescript
createXxxSlice(adapter: StorageAdapter, ...callbacks): SliceCreator<XxxSlice>
```

- 第一个参数必须是 `StorageAdapter`
- 所有实体变更需调用 `adapter.persistChange`
- 同步触发通过回调（`triggerSync`），不直接导入 `SyncService`

### 3.4 Feature 模块自治
```
features/<name>/
├── screens/        (可选 — 多数 screen 在根目录)
├── components/     (本 feature 私有组件)
├── shared/         (本 feature 内部共享)
├── layouts/        (布局变体)
├── pages/          (子页面)
└── services/       (副作用服务)
```

跨 feature 引用限制：只能通过 `components/` 共享 UI。

## 4. ESLint 配置增强建议

基于现有 `eslint.base.js` 分析，建议添加：

| 规则 | 目标 | 优先级 |
|------|------|--------|
| `no-restricted-imports` | 阻止 `packages/core` 导入 `apps/*` 或 `react-native` | P0 |
| `@typescript-eslint/no-unnecessary-condition` | 捕获多余 null check | P1 |
| `@typescript-eslint/prefer-nullish-coalescing` | 统一 `??` 优于 `\|\|` | P1 |
| `import/no-restricted-paths` | 阻止跨层导入 | P1 |
| `no-console` | 强制使用 `createLogger` | P1 |
| `react-hooks/exhaustive-deps` | 确保 `useEffect` deps 完整 | P0 |
| `max-depth` (已有) | 保持嵌套可控 | 已有 |
| `max-lines-per-function` (已有) | 控制函数长度 | 已有 |

## 5. 文档结构模板

详见 `GLOBAL-CODE-STANDARDS.md` 和 `ARCHITECTURE-CONSTRAINTS.md` 正文。