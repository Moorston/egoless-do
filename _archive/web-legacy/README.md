# Web Legacy — Web App (Archived)

> **归档日期**: 2026-07-05
> **归档原因**: AR-03 — web 已废弃，所有业务逻辑已迁移至 `packages/core/`
> **原路径**: `apps/web/`

## 目录

- `src/` — Next.js 15 PWA 应用代码
  - `src/app/` — 页面 & API routes
  - `src/components/` — UI 组件
  - `src/store/` — Zustand store
  - `src/lib/` — 工具函数
  - `src/types/` — 类型定义
- `public/` — 静态资源（音频等）
- `infra/` 相关 Docker 和 nginx 配置已移除

## 参考

- AR-03 详情: `AGENTS.md`
- 替代后端: `backend/` (PocketBase)