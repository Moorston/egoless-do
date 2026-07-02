## Why

项目经过 8 个 feature change 的迭代（chanting-audio, diet-page, zhiguan-page, mantra-history, mantra-page, give-page, mantra-chanting, sleep-page），代码在有机增长过程中积累了结构性债务。当前 root 目录噪音大、后端双轨制、mobile 组件归属三足鼎立、25 个 feature 各自为政、core 与应用层边界模糊。新人打开仓库后需要 30+ 分钟才能理解"这段代码应该放哪"，feature 开发平均要面对 4-5 个候选目录的决策疲劳。

本次重构不改变任何业务行为，只调整文件/目录的物理位置与归属约定，让项目结构回归"看一眼就知道放哪"的清爽状态。

## What Changes

### 删除（remove）
- `package/dist/` — 空壳构建产物目录，无引用
- `pocketbase/` — 与 `backend/` 完全重复，合并到后者
- `apps/mobile/src/features/sutra/SutraScreen.tsx.bak` — 备份文件
- `pocketbase/test_response.json` — 测试遗留

### 移动（move）— 归类到 `infra/`
- `nginx/` → `infra/nginx/`
- `Dockerfile.web` → `infra/docker/Dockerfile.web`
- `docker-compose.yml` (root) → `infra/docker/docker-compose.yml`
- `scripts/` → `infra/scripts/`

### 移动（move）— 合并 backend
- `backend/pocketbase.exe` → 保留在 `backend/`（主副本）
- `backend/pb_data_backup/` → 保留在 `backend/`
- 删除 `pocketbase/` 目录（所有内容已合并或被 gitignore）

### 移动（move）— 清理 mobile 内部
- `apps/mobile/src/infra/offlineAware.ts` → `apps/mobile/src/db/`（数据库感知层）
- `apps/mobile/src/infra/useNetworkStatus.ts` → `apps/mobile/src/hooks/`（跨 feature hook）
- `apps/mobile/src/infra/useAuthToken.ts` → `apps/mobile/src/store/`（auth 相关）
- 删除 `apps/mobile/src/infra/` 目录

### 移动（move）— 共享 UI 归 core
- `apps/mobile/src/shared/components/base/*` (Button, Card, Drawer, Input, List, Modal) → `packages/core/src/ui/`
- `apps/mobile/src/shared/components/ThemeProvider.tsx` → `packages/core/src/ui/theme/`
- `apps/mobile/src/shared/components/index.ts` → 更新导出路径
- `apps/mobile/src/shared/components/README.md` → 删除（文档过时）
- `apps/mobile/src/shared/hooks/useAudioCache.ts` → `packages/core/src/utils/`（通用工具）
- `apps/mobile/src/shared/types/*` → 合并到 `packages/core/src/types/`
- `apps/mobile/src/shared/utils/*` → 合并到 `packages/core/src/utils/`
- 评估 `apps/mobile/src/shared/components/base/` 之外的其他组件归属

### 移动（move）— 业务逻辑归 core
- `apps/mobile/src/data/MobileDataGateway.ts` → 合并到 `packages/core/src/data/DataGateway.ts`
- `apps/mobile/src/components/charts/*` → `packages/core/src/ui/charts/`
- `apps/web/src/components/charts/*` → 同上（合并重复图表）

### 移动（move）— 业务服务归 domain
- `apps/mobile/src/features/notifications/NotificationService.ts` → `packages/core/src/domain/notifications/`
- `apps/mobile/src/features/health/HealthService.ts` → `packages/core/src/domain/health/`

### 移动（move）— 业务逻辑归 business
- `apps/mobile/src/features/home/utils/homeDateUtils.ts` → `packages/core/src/business/dateUtils.ts`
- `apps/mobile/src/features/exercise/shared/*` → 评估后归 `packages/core/src/business/exercise/`
- `apps/mobile/src/features/reflections/core/*` → 评估后归 `packages/core/src/business/reflections/`

### 移动（move）— 业务 store 归 core store
- `apps/mobile/src/features/music/useMusicStore.ts` → `packages/core/src/store/createMusicSlice.ts`（或保留在 mobile 但明确边界）
- `apps/mobile/src/features/music/services/*` → `packages/core/src/domain/music/`

### 移动（move）— 业务 hook 归 core
- `apps/mobile/src/features/exercise/hooks/*` → 评估后归 `packages/core/src/utils/` 或 `packages/core/src/business/`
- `apps/mobile/src/features/global-pulse/hooks/*` → 评估后归 core

### 移动（move）— 业务组件归 core/ui
- `apps/mobile/src/features/global-pulse/components/*` → 评估后归 `packages/core/src/ui/`（如果是通用可视化组件）

### 移动（move）— 业务类型归 core
- `apps/mobile/src/features/global-pulse/types/*` → `packages/core/src/types/`
- `apps/mobile/src/features/exercise/pages/types.ts` → `packages/core/src/types/`

### 移动（move）— 业务服务归 core
- `apps/mobile/src/features/global-pulse/services/*` → `packages/core/src/domain/globalPulse/`
- `apps/mobile/src/features/music/services/*` → `packages/core/src/domain/music/`

### 移动（move）— 业务 hook 归 core
- `apps/mobile/src/features/global-pulse/hooks/*` → `packages/core/src/utils/` 或 `packages/core/src/business/`

### 移动（move）— 业务组件归 core/ui
- `apps/mobile/src/features/global-pulse/components/*` → 评估后归 `packages/core/src/ui/`（如果是通用可视化组件）

### 移动（move）— 业务类型归 core
- `apps/mobile/src/features/global-pulse/types/*` → `packages/core/src/types/`
- `apps/mobile/src/features/exercise/pages/types.ts` → `packages/core/src/types/`

### 移动（move）— 业务服务归 core
- `apps/mobile/src/features/global-pulse/services/*` → `packages/core/src/domain/globalPulse/`
- `apps/mobile/src/features/music/services/*` → `packages/core/src/domain/music/`

## Capabilities

### Modified Capabilities

- `codebase-structure` — 项目目录架构（本次重构主体）
- `deployment` — 部署配置（移动到新位置，不改内容）
- `pocketbase` — 后端运行时（合并双轨，不改行为）

### Removed Capabilities

（本次不改功能，无删除）

## Impact

### 受影响文件（预估）
- 删除：~5 个文件/目录
- 移动：~80-120 个文件
- 修改 import 路径：~200-400 处

### 受影响模块
- `apps/mobile` — 主要受影响方
- `apps/web` — 仅 charts 合并
- `packages/core` — 接收大量迁入
- `backend/` — 接收 pocketbase/ 合并

### 风险点
- **import 路径断裂**：大规模移动后必须全局搜索旧路径
- **core 包膨胀**：迁入过多会让 core 失去"业务无关"的纯洁性，需要严格把关
- **turbo 构建缓存**：移动后需要 `turbo reset-cache`
- **git blame 断裂**：大量 `git mv` 后历史追踪变弱（但 `git log --follow` 仍可工作）

### 回滚策略
- 每完成一个 Phase 做一次 commit，可单 phase 回滚
- 不跨 Phase 批量提交

### 不在本次范围
- `apps/web/` deprecated 处理（用户决策 #1）
- `features/` → `app/` 迁移（用户决策 #3）
- `reflections/` 结构解体（用户决策 #4）
- feature 模板统一化（留作后续 change）
