# PRD: DX + 测试增强

## 背景
当前 DX 基础（ESLint + TS + Vitest）已具备，但缺少文档、自动化工具、性能监控。测试覆盖率 ~70%，目标 90%。

## 需求

### 1. 文档（3 天）
- ADR（Architecture Decision Records）
  - `docs/adr/001-why-zustand.md`
  - `docs/adr/002-why-pocketbase.md`
  - `docs/adr/003-why-offline-first.md`
- 架构文档
  - `docs/architecture/data-flow.md`（Mermaid 图）
  - `docs/architecture/sync-protocol.md`
- 开发者指南
  - `docs/guides/setup.md`
  - `docs/guides/testing.md`
  - `docs/guides/architecture.md`

### 2. 工具（2 天）
- 代码生成器（Plop.js）
  - `plop slice`：生成新 slice 模板
  - `plop screen`：生成新页面模板
  - `plop test`：生成测试文件模板
- Git Hooks（Husky）
  - pre-commit：lint-staged + type-check
  - commit-msg：commitlint（conventional commits）
- 性能分析
  - React DevTools Profiler 集成文档
  - Flipper SQLite 插件配置

### 3. 监控（2 天）
- PostHog 性能事件
  - `app_start_time`（P50/P95/P99）
  - `list_fps`（列表帧率）
  - `sync_latency`（同步延迟）
- 告警规则
  - 启动时间 > 1s → Slack 通知
  - 错误率 > 1% → 邮件通知

### 4. 测试提升（5 天）
- 单元测试：1832 → 2500（覆盖 90%）
- 集成测试：8 → 20（覆盖核心流程）
- E2E 测试：5 → 15（Maestro）
- 性能基准测试
  - 启动时间基准
  - 列表帧率基准
  - 同步延迟基准

## 验收标准
- [ ] ADR ≥ 3 篇
- [ ] 架构文档 ≥ 2 篇
- [ ] 开发者指南 ≥ 3 篇
- [ ] Plop 生成器 ≥ 3 个模板
- [ ] Husky pre-commit 配置
- [ ] PostHog 性能事件 ≥ 3 个
- [ ] 单元测试 ≥ 2500
- [ ] 集成测试 ≥ 20
- [ ] E2E 测试 ≥ 15
- [ ] 性能基准测试 ≥ 3 个

## 影响范围
- 新增：`docs/`, `plopfile.js`, `.husky/`, `scripts/`
- 修改：`package.json`, `.github/workflows/ci.yml`
- 不影响：应用代码、测试代码

## 工作量
- 文档：3 天
- 工具：2 天
- 监控：2 天
- 测试：5 天
- **总计：12 天（2-3 周）**

## 回滚点
文档/工具独立，可逐个 revert
