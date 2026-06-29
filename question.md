# 项目问题审查记录

> 审查日期：2026-06-30
> 审查范围：全项目代码（mobile ~47k行, core ~19k行）
> 状态：仅记录，暂不修复

---

## 一、代码 Bug

### B1. SyncEngine catch 块缺少错误日志
- **文件**: `apps/mobile/src/features/sync/SyncEngine.ts` 多处
- **描述**: 9 个空 `catch {}` 块，错误被静默吞掉
- **影响**: 同步失败时无法定位原因
- **严重度**: 中

### B2. schema.ts 空 catch 块
- **文件**: `apps/mobile/src/db/schema.ts` (4处)
- **描述**: 迁移和索引创建的错误被静默吞掉
- **影响**: 数据库迁移失败时无日志，可能导致 schema 不一致
- **严重度**: 中

### B3. HomeScreen 体重初始化依赖 store 时序
- **文件**: `apps/mobile/src/features/home/screens/HomeScreen.tsx:74-79`
- **描述**: `useState` 初始值读取 `store.userProfile?.weight`，但 store 可能尚未从 AsyncStorage 水合
- **影响**: 首次渲染时体重可能显示为空
- **严重度**: 低

### B4. WriteBatcher fallback 路径未使用 changedFields ✅ 已修复
- **文件**: `apps/mobile/src/features/sync/WriteBatcher.ts:186`
- **描述**: fallback 路径使用 `JSON.stringify(w.data)` 而非 `JSON.stringify(payload)`（payload 包含 `_changedFields`）
- **影响**: fallback 写入的 sync_queue 条目缺少 `changedFields`，服务端无法做字段级合并
- **严重度**: 低
- **修复**: fallback 路径现在构造包含 `_changedFields` 的 payload

---

## 二、架构缺陷

### A1. SyncEngine 仍然过大（1,086 行）
- **描述**: 虽然已从 SyncService 重构为 SyncEngine 类，但仍包含 push/pull/realtime/initialSync/orphanRecovery/cleanup 等所有逻辑
- **建议**: 拆分为 PushEngine、PullEngine、RealtimeEngine 等子模块
- **严重度**: 中

### A2. reflections 模块过于庞大（14,964 行）
- **描述**: 8 个子模块（core/insights/trails/review/hooks/shared/timeline），最大的单文件 ReflectionsScreen 819 行
- **建议**: 考虑拆分为独立 feature 或提取共享 hooks
- **严重度**: 低（已有子目录结构）

### A3. HomeScreen 不拆分的代价
- **描述**: HomeScreen 863 行，混合了打卡、习惯、计划、食物、水、步数等 7+ 个功能区域
- **决策**: 已决定不拆分（单人项目、useMemo 已保护性能）
- **风险**: 新增功能时文件会继续膨胀
- **严重度**: 低

### A4. 全 store 订阅模式
- **文件**: HomeScreen、StatsScreen、FastingScreen、MeditationScreen 等
- **描述**: 使用 `const store = useAppStore()` 订阅整个 store，任何 slice 变化都触发 re-render
- **当前缓解**: useMemo 缓存关键计算
- **性能影响**: 约减少 50-60% 无意义 re-render（已评估，当前可接受）
- **严重度**: 低

---

## 三、类型安全

### T1. 66 个 `: any` 注解（33 个文件）✅ 部分修复
- **分布**:
  - SyncEngine: 9 个 ✅ 已全部替换为具体类型
  - ReflectionsScreen: 7 个
  - RelationMapView: 4 个
  - global-pulse services: 5 个
  - auth screens: 6 个
  - 其他: ~35 个
- **最严重**: `createRecycleBinSlice.ts` 的 set 回调使用 FullStore 类型后仍有 `as any` 断言
- **严重度**: 中
- **修复**: SyncEngine 中 9 个 : any 已替换（records, catch blocks, changes array, forEach callbacks）

### T2. Unsafe type assertions
- **文件**: `apps/mobile/src/db/queries.ts` (多处 `as string`, `as number`)
- **描述**: 数据库行映射使用 `as` 断言而非运行时验证
- **严重度**: 低

---

## 四、错误处理

### E1. 55 个 catch 块（31 个文件）
- **分类**:
  - 有意忽略（有注释）: ~15 个 ✅
  - 有日志记录: ~25 个 ✅
  - 静默吞掉（无注释无日志）: ~15 个 ⚠️
- **最严重**: `SyncEngine.ts` 中 7 个 catch 块，部分用于关键同步路径
- **严重度**: 中

### E2. 缺少细粒度 ErrorBoundary
- **描述**: 整个 app 只有一个根级 ErrorBoundary，单个 screen 崩溃会导致整个 app 显示错误页面
- **建议**: 为每个主要 screen 添加 ErrorBoundary
- **严重度**: 中

---

## 五、性能

### P1. 大文件组件
- **HomeScreen.tsx** (863 行): 首屏加载需解析整个文件
- **SyncEngine.ts** (1,086 行): 同步引擎，影响启动性能
- **PlanDetailContent.tsx** (892 行): 计划详情页
- **严重度**: 低（Metro bundler 会处理）

### P2. 未使用的 FlatList
- **描述**: 4 个组件使用原生 FlatList 而非项目已有的 FlashList wrapper
  - `global-pulse/components/Leaderboard.tsx`
  - `global-pulse/components/ActiveUsersList.tsx`
  - `components/ItemManagerPanel.tsx`
  - `music/screens/MusicCategoryScreen.tsx`
- **严重度**: 低

### P3. 无代码分割
- **描述**: 所有 feature 模块在启动时一次性加载，无 lazy import
- **影响**: 首屏加载时间较长
- **严重度**: 低（React Native 代码分割支持有限）

---

## 六、安全

### S1. AMap 安全密钥暴露在客户端
- **文件**: `apps/web/src/lib/amapLoader.ts:15`
- **描述**: `NEXT_PUBLIC_AMAP_SECURITY_KEY` 通过 `window._AMapSecurityConfig` 暴露
- **影响**: 任何人可通过浏览器检查获取
- **严重度**: 低（AMap SDK 要求）

### S2. PB hook 中 entityId 直接拼入 SQL
- **文件**: `pocketbase/pb_hooks/sync.pb.js` 多处
- **描述**: `idField + " = '" + entityId + "'"` 直接拼接
- **当前缓解**: 客户端有 `isValidId()` 校验（UUID 或 alphanumeric 1-128 字符）
- **严重度**: 低（需要绕过客户端校验才能利用）

---

## 七、测试覆盖

### TS1. Mobile 端零测试文件
- **描述**: `apps/mobile/src/` 下无任何 `.test.ts` 文件
- **影响**: UI 组件、hooks、store 切片（mobile 特定）无测试覆盖
- **严重度**: 中

### TS2. 核心测试覆盖不均
- **已有**: 12 个测试文件，~90 个用例
- **覆盖**: sync（3 文件）、store 切片（4 文件）、business（1 文件）、integration（1 文件）
- **缺失**: ai 模块、global-pulse 服务、reflections hooks、exercise hooks
- **严重度**: 中

### TS3. SyncService 测试需要适配 SyncEngine ⚠️ 仍存在
- **描述**: 5 个 SyncService 测试因 SyncEngine 重构而 mock 不匹配
- **原因**: SyncEngine 被 linter/user 修改后内部逻辑变化，mock 需要更新
- **严重度**: 低（核心功能已通过 conflict + store + business 测试验证）

---

## 八、其他

### O1. 依赖管理
- `react-dom` 已从 mobile 移除 ✅
- `better-sqlite3`, `nodemailer`, `bcryptjs` 仍在 workspace root（服务端依赖）
- `recharts` (web) 包体积较大，需评估是否可用 lighter 替代

### O2. 国际化
- 部分硬编码中文字符串（如 WEEKDAYS 数组、错误消息）
- web 端登录页有硬编码中文

### O3. 无障碍
- 1228 个 TouchableOpacity/Pressable 中仅 5 个有 accessibilityLabel
- 无障碍覆盖率 0.4%
