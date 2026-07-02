# Tasks

## Phase 0 — 低风险清理（1 小时，零业务影响）✅ 已完成

**Commit**: `1124bac` — `chore: restructure root — merge pocketbase/ into backend/, clean garbage`

- [x] 删除 `package/dist/` 目录
- [x] 删除 `apps/mobile/src/features/sutra/SutraScreen.tsx.bak`
- [x] 删除 `pocketbase/test_response.json`
- [x] 合并 `pocketbase/` → `backend/`（保留后者为主副本）
  - 确认 `backend/pb_hooks/` 与 `pocketbase/pb_hooks/` 内容一致
  - 确认 `backend/pb_migrations/` 与 `pocketbase/pb_migrations/` 内容一致（backend 是超集，多 7 个迁移文件）
  - 删除 `pocketbase/` 目录
- [x] 更新 `package.json` 中 `pb`/`pb:setup` 脚本路径（`pocketbase\` → `backend\`）
- [x] 复制 `pocketbase/setup.ps1` → `backend/setup.ps1`
- [x] 删除 `pocketbase/CHANGELOG.md`, `LICENSE.md`, `package.json`, `pb_data_backup/types.d.ts`
- [x] 运行 `pnpm type-check` — 预先存在的 i18n 重复键错误（非本次引入）
- [x] 运行 `pnpm test` — 5 个预先存在的测试失败（非本次引入）
- [x] Commit: `chore: restructure root — merge backend, move deploy files to infra/`

**注意**: 原计划中"移动 nginx/Dockerfile.web/docker-compose.yml/scripts 到 infra/"未执行，原因是 root `docker-compose.yml` 是主部署配置，移动会改变部署流程，风险超出 P0 范围。留作后续 Phase 0.5。

## Phase 1 — 清理 mobile 内部碎片（半天）✅ 已完成

**Commit**: `10e7bd8` — `chore(mobile): clean up infra/ and remove dead MobileDataGateway`

- [x] 拆解 `apps/mobile/src/infra/`
  - `offlineAware.ts` → `apps/mobile/src/net/offlineAware.ts`（网络层工具，创建新 net/ 目录）
  - `useNetworkStatus.ts` → `apps/mobile/src/store/useNetworkStatus.ts`（zustand store）
  - `useAuthToken.ts` → `apps/mobile/src/store/authToken.ts`（auth 工具）
- [x] 删除 `apps/mobile/src/infra/` 目录
- [x] 更新上述 3 个文件的 import 路径
  - `global-pulse/hooks/useGlobalPulse.ts` 中的 `infra/useNetworkStatus` → `store/useNetworkStatus`
  - `global-pulse/services/globalPulseApi.ts` 中的 `infra/offlineAware` → `net/offlineAware`
- [x] 评估 `apps/mobile/src/data/MobileDataGateway.ts` 与 `packages/core/src/data/DataGateway.ts` 的合并方案
  - 发现 MobileDataGateway 是死代码（实现 DataGateway 接口但从未实例化）
  - 决定直接删除而非合并
- [x] 删除 `MobileDataGateway.ts` 和 `data/` 目录
- [x] Commit: `chore(mobile): clean up infra and merge data gateway`

**注意**: 原计划中 `offlineAware.ts → db/` 改为 `→ net/`，因为它是网络感知的 fetch 包装器，不是数据库层。
**注意**: 原计划中 `useNetworkStatus.ts → hooks/` 改为 `→ store/`，因为它是 zustand store，不是 React hook。
**注意**: 发现 `global-pulse/hooks/useNetworkStatus.ts`（React hook）与 `infra/useNetworkStatus.ts`（zustand store）同名但功能不同，移动时避免了命名冲突。

## Phase 1.5 — 移动部署文件到 infra/（待做）

**前置条件**: 需要更新 `.github/workflows/`、`README.md` 中的路径引用。

- [ ] 创建 `infra/` 目录结构
  - `infra/docker/`
  - `infra/nginx/`
  - `infra/scripts/`
- [ ] 移动 `nginx/` → `infra/nginx/`
- [ ] 移动 `Dockerfile.web` → `infra/docker/Dockerfile.web`
- [ ] 移动 root `docker-compose.yml` → `infra/docker/docker-compose.yml`
- [ ] 移动 `scripts/` → `infra/scripts/`
- [ ] 更新 `infra/scripts/*.sh` 中的相对路径引用
- [ ] 更新 `README.md` 中的路径引用
- [ ] 更新 `.github/workflows/` 中的路径引用（如有）
- [ ] Commit: `chore: move deploy files to infra/`

## Phase 2 — 共享 UI 归 core（1-2 天）

- [ ] 创建 `packages/core/src/ui/` 目录
- [ ] 创建 `packages/core/src/ui/theme/` 目录
- [ ] 迁移 `apps/mobile/src/shared/components/base/*` → `packages/core/src/ui/`
  - Button.tsx
  - Card.tsx
  - Drawer.tsx
  - Input.tsx
  - List.tsx
  - Modal.tsx
- [ ] 迁移 `apps/mobile/src/shared/components/ThemeProvider.tsx` → `packages/core/src/ui/theme/`
- [ ] 更新 `packages/core/src/index.ts` 添加 UI 导出
- [ ] 更新 `packages/core/package.json` 添加 `./ui` export
- [ ] 更新所有 mobile 中的 import 路径
- [ ] 删除 `apps/mobile/src/shared/components/README.md`
- [ ] 评估 `apps/mobile/src/shared/` 其余文件归属
  - `hooks/useAudioCache.ts` → `packages/core/src/utils/`
  - `types/*` → `packages/core/src/types/`
  - `utils/*` → `packages/core/src/utils/`
- [ ] 执行迁移并更新引用
- [ ] Commit: `chore: move shared UI to packages/core/src/ui/`

## Phase 3 — 图表合并（半天）

- [ ] 对比 `apps/mobile/src/components/charts/` 与 `apps/web/src/components/charts/`
- [ ] 合并重复图表到 `packages/core/src/ui/charts/`
- [ ] 更新 mobile 和 web 的 import 路径
- [ ] 删除 `apps/mobile/src/components/charts/`
- [ ] 删除 `apps/web/src/components/charts/`
- [ ] Commit: `chore: merge charts into packages/core/src/ui/charts/`

## Phase 4 — 业务服务归 domain（1 天）

- [ ] 创建 `packages/core/src/domain/` 目录
- [ ] 迁移 `apps/mobile/src/features/notifications/NotificationService.ts` → `packages/core/src/domain/notifications/`
- [ ] 迁移 `apps/mobile/src/features/health/HealthService.ts` → `packages/core/src/domain/health/`
- [ ] 迁移 `apps/mobile/src/features/global-pulse/services/*` → `packages/core/src/domain/globalPulse/`
- [ ] 迁移 `apps/mobile/src/features/music/services/*` → `packages/core/src/domain/music/`
- [ ] 更新所有引用
- [ ] Commit: `chore: move business services to packages/core/src/domain/`

## Phase 5 — 业务逻辑归 business（1-2 天）

- [ ] 迁移 `apps/mobile/src/features/home/utils/homeDateUtils.ts` → `packages/core/src/business/dateUtils.ts`
- [ ] 评估 `apps/mobile/src/features/exercise/shared/*` 归属
- [ ] 评估 `apps/mobile/src/features/exercise/hooks/*` 归属
- [ ] 评估 `apps/mobile/src/features/global-pulse/hooks/*` 归属
- [ ] 执行迁移并更新引用
- [ ] Commit: `chore: move business logic to packages/core/src/business/`

## Phase 6 — 收尾验证（半天）

- [ ] 运行 `pnpm type-check` 全量检查
- [ ] 运行 `pnpm test` 全量测试
- [ ] 运行 `pnpm lint` 检查
- [ ] 运行 `turbo reset-cache`
- [ ] 更新 `README.md` 目录树
- [ ] 更新 `CLAUDE.md` 架构说明
- [ ] Commit: `chore: verify and document restructure`

## 不在本次范围（留后续 change）

- ❌ `apps/web/` deprecated 处理
- ❌ `features/` → `app/` 迁移
- ❌ `reflections/` 结构解体
- ❌ feature 模板统一化
- ❌ `assets/` 迁移到 apps/
- ❌ `docs/` 目录创建
- ❌ `tests/` 目录重命名
