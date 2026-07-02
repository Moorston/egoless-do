## Why

全面代码审查发现了 18 个问题，其中 P0 级别的数据安全问题需要立即修复：
- SyncEngine 中硬编码了 37 个表名，与 entitySchemas.ts 重复
- SQL 拼接使用模板字符串，存在注入风险
- 同步关键路径上的空 catch 块静默吞掉错误

P1 级别的可维护性问题：
- 177/192 个 useEffect 缺少清理函数
- SyncEngine 1199 行是 God Class
- 双 Theme 系统导致混乱
- apps/ 没有任何单元测试

## What Changes

### P0 — 数据安全修复

1. **SyncEngine 硬编码表名** → 从 `SCHEMAS` 动态获取
2. **SQL 拼接** → 提取到受控的 helper 函数
3. **同步关键路径空 catch** → 添加日志

### P1 — 可维护性改进

4. **useEffect 清理** → 批量审查高风险组件
5. **SyncEngine 拆分** → 提取队列管理、孤儿恢复
6. **双 Theme 系统** → 统一到 core
7. **关键模块测试** → 添加 SyncEngine/schema 测试

### P2 — 长期优化（不在本次范围）

- 大文件拆分（BreathingScreen, SleepScreen）
- reflections/ 拆分
- practice/ 拆分
- 开启 noImplicitAny

## Capabilities

### Modified Capabilities

- `sync-engine` — 修复硬编码表名、SQL 拼接、空 catch
- `theme-system` — 统一双 Theme 系统
- `test-coverage` — 添加关键模块测试

## Impact

### 受影响文件
- `apps/mobile/src/features/sync/SyncEngine.ts` — 主要重构
- `apps/mobile/src/db/syncQueue.ts` — SQL helper
- `packages/core/src/sync/entitySchemas.ts` — 添加 ALL_TABLES 常量
- `apps/mobile/src/components/UI.tsx` — Theme 统一
- 多个 useEffect 组件 — 清理函数

### 风险点
- SyncEngine 重构可能影响同步行为
- Theme 统一可能影响 UI 外观
- 需要充分测试
