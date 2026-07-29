# PRD: cleanupApp 机制

## 背景
Session 52 深度审查识别 4 处模块级永久订阅无清理路径，导致测试间订阅累积、app 退出后闭包引用残留。

## 需求
1. 新建 `subscriptionRegistry.ts` 提供 `registerCleanup` + `cleanupApp`
2. 4 处标记位置接入注册表
3. 测试 setup (`setup.ts`) 的 `afterEach` 调用 `cleanupApp()`
4. 清理过程 best-effort（不抛错）

## 验收标准
- [ ] `subscriptionRegistry.ts` 存在并导出 `registerCleanup`、`cleanupApp`
- [ ] 4 处 TODO[P1] 标记替换为 `registerCleanup(...)` 调用
- [ ] `setup.ts` 的 `afterEach` 接入 `cleanupApp`
- [ ] `npx tsc --noEmit` 无新增错误
- [ ] `npx vitest run` 全量测试通过（重点 initApp/useAppStore/useNetworkStatus）

## 影响范围
- 5 个文件（1 新 + 4 改 + setup）
- 行为变更：测试间订阅隔离、app 退出清理

## 回滚点
revert 5 文件即可恢复（注册表是附加层，无破坏性）
