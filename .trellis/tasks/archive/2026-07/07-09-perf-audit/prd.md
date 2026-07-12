# 性能分析

## Goal

分析并优化应用性能，包括渲染性能、启动速度、内存使用、同步效率。

## Requirements

- 分析组件渲染性能（内联 style、缺少 memo、大组件）
- 分析 Store 计算性能（未缓存的统计方法）
- 分析 SQLite 查询性能（缺少索引、N+1 查询）
- 分析同步引擎性能（批量操作、重试机制）
- 分析 Bundle 大小（冗余依赖、tree shaking）
- 产出性能报告，按影响排序

## Acceptance Criteria

- [ ] 关键路径渲染无多余重渲染
- [ ] Store 计算方法有缓存
- [ ] SQLite 查询有索引覆盖
- [ ] 同步批量操作优化
- [ ] 性能报告产出

## Scope

已完成：Phase 4 索引 + 计算缓存、Phase 2 批量化、style 迁移（部分）
待完成：剩余 ~3800 内联 style 迁移、Bundle 优化
