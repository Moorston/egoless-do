## Context

感念卡片使用 `colors: readonly [string, string]` 存储渐变背景色。该字段在 `createReflection()` 时从 `MIND_COLORS_EXTENDED` 调色板中选取并写入。渲染时通过 `r.colors[0]`/`r.colors[1]` 读取，fallback 到 `MIND_COLORS_EXTENDED[0]`。

问题链路：同步 push 时 `reflectionToSync()` 遗漏 `colors` → 服务器无此数据 → pull 时 `INSERT OR REPLACE` 覆盖为 NULL → 保留逻辑传出 JSON 字符串 → UI 按数组索引取值得到单个字符。

## Goals / Non-Goals

**Goals:**
- 修复同步链路，使 `colors` 字段在 push/pull 双向正确传输
- 修复 `INSERT OR REPLACE` 语句，不再覆盖本地 colors
- 修复保留逻辑中的类型 bug（JSON 字符串 → 数组）
- UI 层对已有损坏数据做防御性兼容
- Mobile + Web 双端同步修复

**Non-Goals:**
- 不新增颜色选择器功能
- 不改变 `MindReflection` 数据模型结构
- 不做 PocketBase migration（colors 作为 JSON blob 的一部分存储在 data 字段中）
- 不修复非 colors 相关的同步问题

## Decisions

### 1. Sync payload 加入 colors

**选择**：在 `reflectionToSync()` 中加入 `colors: r.colors`。

**理由**：PocketBase 的 reflections collection 使用通用 `data` JSON blob 存储，加入 colors 不需要 schema 变更。这是最直接的修复方式。

**替代方案**：在服务器端做字段映射 — 过度设计，当前架构不需要。

### 2. INSERT OR REPLACE 加入 colors 列

**选择**：在 `INSERT OR REPLACE` 语句中加入 `colors` 列，值为 `JSON.stringify(r.colors)`。

**理由**：直接在 SQL 层面保留 colors，避免依赖事后恢复逻辑。

**替代方案**：改用 `INSERT ... ON CONFLICT DO UPDATE` — 改动更大，且当前 INSERT OR REPLACE 模式在其他字段上工作正常。

### 3. 保留逻辑加 JSON.parse

**选择**：在保留逻辑中，将 SQLite 读出的 JSON 字符串 `JSON.parse` 为数组后再赋给 patch。

**理由**：即使 INSERT 已包含 colors，保留逻辑作为安全网仍需正确工作。当前的 `Map<string, string>` 应改为 `Map<string, [string, string]>`。

### 4. UI 层防御性解析

**选择**：在 `ReflectionCard`、`ReflectionsScreen`、`ShareCard` 中增加 `typeof colors === 'string'` 检测，若为字符串则 `JSON.parse`。

**理由**：已有用户数据中 colors 可能已被损坏为字符串，UI 层兼容可确保这些数据立即恢复正常显示，无需数据迁移。

## Risks / Trade-offs

- **[风险] 已损坏数据量**：如果大量用户的 colors 已被覆盖为 NULL，则仅靠 UI 防御无法恢复（因为 NULL 不是字符串）。→ 缓解：这些用户的 colors 会 fallback 到 `MIND_COLORS_EXTENDED[0]`，至少不会崩溃。未来可考虑从 checkinHistory 中重建。
- **[风险] Web 端同步逻辑差异**：Web 端的 syncService 实现可能与 Mobile 不完全一致。→ 缓解：逐一对比修复，确保两端行为一致。
- **[权衡] 双重保护 vs 代码复杂度**：同时在 SQL 和保留逻辑两处修复增加了代码量，但确保了健壮性。
