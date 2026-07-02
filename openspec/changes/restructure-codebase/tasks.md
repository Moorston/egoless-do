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

## Phase 2 — 共享 UI 归 core（1-2 天）⏸️ 跳过

**原因**: base 组件（Button, Card, Drawer, Input, List, Modal）使用 React Native 特定 API（`View`, `Text`, `StyleSheet`, `TouchableOpacity`, `TextInput` 等），是 mobile 特定组件，不适合迁移到平台无关的 core 包。

**另外**: `Card` 和 `Input` 依赖 `ThemeProvider` 的 `Theme` 类型，该类型与 `packages/core/src/types/shared.ts` 中的 `Theme` 接口完全不同（core.Theme 包含 `name/bg/card/text` 等 UI 主题配置，shared.Theme 包含 `colors/spacing/borderRadius` 设计 token），合并会导致类型冲突。

**决策**: 保留 `apps/mobile/src/shared/components/` 作为 mobile 的共享组件库。

- [ ] ~~创建 `packages/core/src/ui/` 目录~~
- [ ] ~~迁移 base 组件到 core~~
- [ ] ~~迁移 ThemeProvider 到 core~~

## Phase 3 — 图表合并（半天）⏸️ 跳过

**原因**: mobile 图表使用 React Native `View` 实现，web 图表使用 SVG/DOM 实现，两者实现不同，无法简单合并到 core。

- [ ] ~~合并图表到 core~~

## Phase 4 — 业务服务归 domain（1 天）⏸️ 跳过

**原因**: 所有业务服务都依赖 mobile 特定库：
- `NotificationService` 使用 `expo-notifications`
- `HealthService` 使用 `react-native-health`
- `global-pulse/services/` 使用 `expo-sqlite` 和 `offlineAwareFetch`
- `music/services/` 使用 `expo-av`

这些服务无法迁移到平台无关的 core 包。

- [ ] ~~创建 `packages/core/src/domain/` 目录~~
- [ ] ~~迁移业务服务到 core~~

## Phase 5 — 业务逻辑归 business（1-2 天）⏸️ 部分完成

**Commit**: `b7d24d5` — `chore: migrate homeDateUtils to core/business, skip Phase 2/3/4`

- [x] 迁移 `apps/mobile/src/features/home/utils/homeDateUtils.ts` → `packages/core/src/business/dateUtils.ts`
- [x] 更新 `HomeScreen.tsx` 的 import 路径
- [x] 删除 `features/home/utils/` 目录
- [ ] 评估 `apps/mobile/src/features/exercise/shared/*` 归属 — ⏸️ 跳过（UI 组件，mobile 特定）
- [ ] 评估 `apps/mobile/src/features/exercise/hooks/*` 归属 — ⏸️ 跳过（依赖 expo-haptics, expo-location）
- [ ] 评估 `apps/mobile/src/features/global-pulse/hooks/*` 归属 — ⏸️ 跳过（依赖 mobile 特定 API）

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
