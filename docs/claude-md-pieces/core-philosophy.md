# Core 哲学 — sole source of truth

`packages/core` 是**唯一**的业务真理来源。违反这条会产生跨 app 重复、同步灾难、类型本体分裂。

## 硬规则

- 业务逻辑、类型、常量、纯函数 **只** 放 `core`
- `apps/*` 是壳：只放 app-specific 的 UI、导航、平台适配
- `infra/*` 是运维：部署、数据库、脚本
- **移动优于复制**：宁 `git mv` 也不留副本；发现两份相同逻辑 → 合并，不是保留一个
- 跨 app 共享的 UI 放 `core/src/ui/`，不是 `apps/mobile/components/`

## 软规则（建议执行，除非有明确 why）

- core 的每个子目录都该有明确的职责边界；超出职责的文件放到更合适的子目录
- core 里不要出现平台特定 API（如 Expo、RN 的 `Platform`、window）——抽到 apps 侧
- core 里的 store slice 或类型定义不要反向依赖 apps/* （禁止 `import from "apps/..."`）
