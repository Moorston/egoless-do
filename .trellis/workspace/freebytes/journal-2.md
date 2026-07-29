# Journal - freebytes (Part 2)

> Continuation from `journal-1.md` (archived at ~2000 lines)
> Started: 2026-07-29

---



## Session 56: P2 useShallow 全覆盖（16 文件 22 处）

**Date**: 2026-07-29
**Task**: P2 useShallow 全覆盖（16 文件 22 处）
**Branch**: `master`

### Summary

P2 useShallow 全覆盖（session 52 深度审查 22 处标记）：
- 16 个文件各 1 个 commit，共 16 commit
- 每个 useAppStore(s => s.xxx) 改为 useAppStore(useShallow((s: MobileStore) => s.xxx))
- 修复 TS18046 unknown 类型错误 19 处（加 MobileStore 类型注解）
- 验证：65 测试全绿，零新增类型错误
全 session（52-58）累计 33 个 commit。

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `eb0fc9a7` | (see git log) |
| `d19047fc` | (see git log) |
| `74bdce76` | (see git log) |
| `e99d7183` | (see git log) |
| `56bf9caf` | (see git log) |
| `5fb61031` | (see git log) |
| `ac4bf057` | (see git log) |
| `091609c9` | (see git log) |
| `5a8f8eaa` | (see git log) |
| `2aca5a4c` | (see git log) |
| `44ac63a1` | (see git log) |
| `62f7d95d` | (see git log) |
| `a00efe30` | (see git log) |
| `03584d59` | (see git log) |
| `a64b483a` | (see git log) |
| `5bef702f` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 57: Batch 3: P0-4 bodyPlan + P0-5 updated_at + 路由重构

**Date**: 2026-07-29
**Task**: Batch 3: P0-4 bodyPlan + P0-5 updated_at + 路由重构
**Branch**: `master`

### Summary

Batch 3 数据迁移级遗留修复：P0-4 bodyPlan 命名空间（schema+SQLite+服务端pull type过滤）、P0-5 updated_at 过滤（client-side）、路由 as never 重构（18处移除+类型扩展）。4 commit。全 session（52-59）累计 17 commit。

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `3b141a88` | (see git log) |
| `b84564a5` | (see git log) |
| `df3fdd2d` | (see git log) |
| `4b6ac6c0` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete
