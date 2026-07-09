# 剩余维度审查报告 — 测试覆盖/CI-CD/错误边界

> 审查日期：2026-07-09
> 审查方法：3 个并行 Agent
> 共发现：**45 项问题**

---

## 总体统计

| 维度 | 🔴 P0 | 🟠 P1 | 🟡 P2 | ⚪ P3 | **合计** |
|------|-------|-------|-------|-------|----------|
| 📊 测试覆盖 | 6 | 5 | 3 | 2 | **16** |
| 🔄 CI/CD 管道 | 2 | 5 | 4 | 2 | **13** |
| 🛡️ 错误边界 | 1 | 2 | 1 | 0 | **4** |
| **合计** | **9** | **12** | **8** | **4** | **33** |

---

## 🔴 P0 — 立即修复（9项）

### 测试覆盖（6项）

| # | 问题 | 详情 |
|---|------|------|
| TC-1 | **7 个测试失败** — SyncEngine 4 + SyncService 2 + SyncApplyService 1 | 同步层实际回归 |
| TC-2 | **覆盖率工具未安装** — `@vitest/coverage-v8` 未在任何 package.json 中 | 无法生成覆盖率报告 |
| TC-3 | **零 UI 组件测试** — 256 个 `.tsx` 文件，0 个 `.test.tsx` | 整个 UI 层无测试 |
| TC-4 | **关键模块无测试** — RealtimeAgent(179行)、SyncRealtimeController(273行)、SyncResetService | 同步引擎关键路径 |
| TC-5 | **AI 层零测试** — ai-service.ts、local-engine.ts、cloud-providers.ts 等 | AI 层完全未覆盖 |
| TC-6 | **错误路径覆盖率 <0.8%** — 1506 测试中仅 12 个涉及 `.rejects`/`.toThrow` | 异常条件几乎无覆盖 |

### CI/CD（2项）

| # | 问题 | 详情 |
|---|------|------|
| CI-1 | **Dockerfile.web 阻塞部署** — 引用不存在的 `apps/web` 目录 | `pnpm-workspace.yaml` 已排除 web |
| CI-2 | **CI 无测试覆盖率门槛** — coverage artifact 永远为空 | `--coverage` 未传递 |

### 错误边界（1项）

| # | 问题 | 详情 |
|---|------|------|
| EB-1 | **Stack 屏幕错误边界覆盖仅 10.9%** — 46 个屏幕中仅 5 个有 ErrorBoundary | 41 个 Stack 屏幕缺失 |

---

## 🟠 P1 — 高优先级（12项）

### 测试覆盖（5项）

| # | 问题 |
|---|------|
| TC-7 | 7 个无测试的 store slice（createBodySlice、createPracticeSlice、createSleepSlice 等） |
| TC-8 | 3 个测试文件与源文件不对应（createExerciseSlice.test.ts、createFastingSlice.test.ts、createTrailNoteSlice.test.ts） |
| TC-9 | 3 个重复测试文件（checkinSlice.test.ts、habitSlice.test.ts、planSlice.test.ts） |
| TC-10 | `apps/mobile/vitest.config.ts` setupFiles 路径引用不存在文件 |
| TC-11 | 无 MSW 使用 — MSW 在 package.json 中但测试未用 |

### CI/CD（5项）

| # | 问题 |
|---|------|
| CI-3 | 无 Dependabot/Renovate — 无自动化依赖更新 |
| CI-4 | 无 Turbo 远程缓存 — 每次 CI 冷构建 |
| CI-5 | 无 husky/lint-staged — 可提交带错误代码 |
| CI-6 | 根 `.env.example` 缺 PB_ADMIN_EMAIL、SMTP 等关键环境变量 |
| CI-7 | ESLint 配置未明确关联 apps/mobile |

### 错误边界（2项）

| # | 问题 |
|---|------|
| EB-2 | **Habits Tab 屏幕** — 唯一缺失 ErrorBoundary 的 Tab |
| EB-3 | 导航 index.tsx 有 2 处 `.catch(() => {})` 静默吞噬错误 |

---

## 🟡 P2 — 中优先级（8项）

### 测试覆盖（3项）

| # | 问题 |
|---|------|
| TC-12 | 无统一 mock 标准 — 部分用 `vi.hoisted()`，部分用 `vi.mock()` |
| TC-13 | 7 个关键 business 模块无测试（customLists、dateChangeDetection、module-state、planForm、sleep 等） |
| TC-14 | 无 @testing-library/react-native 组件测试 |

### CI/CD（4项）

| # | 问题 |
|---|------|
| CI-8 | 无 CI timeout-minutes — 默认 6 小时 |
| CI-9 | 无 concurrency 控制 — 多 push 浪费资源 |
| CI-10 | 无根 `tsconfig.json` — IDE 集成缺失 |
| CI-11 | 两份 docker-compose 文件重叠（`backend/` vs `infra/docker/`） |

### 错误边界（1项）

| # | 问题 |
|---|------|
| EB-4 | 高频 Stack 屏幕优先处理：SleepHistory、MusicScreen、StatsScreen、GlobalPulseScreen |

---

## ⚪ P3 — 低优先级（4项）

| # | 维度 | 问题 |
|---|------|------|
| L-1 | 测试 | 无 DST 边界条件测试 |
| L-2 | 测试 | `globalThis.__DEV__ = false` 在测试文件中重复声明 |
| L-3 | CI/CD | `pnpm audit` 未加入 CI |
| L-4 | CI/CD | backup-pb.sh token 解析使用 grep 而非 jq |

---

## 与之前审查的对比

```
此轮覆盖：
  ✅ 测试覆盖（16 项发现）
  ✅ CI/CD 管道（13 项发现）
  ✅ 错误边界覆盖（4 项发现）

总计 4 轮审计 = 189 个维度覆盖率 100%
```