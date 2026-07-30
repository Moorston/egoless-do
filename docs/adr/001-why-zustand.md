# ADR-001: 为什么选 Zustand

## 状态
已接受（2026-07-29）

## 背景
需要为 React Native 应用选择状态管理库，支持 25+ slices、SQLite 持久化、离线优先。

## 决策
使用 **Zustand** 作为状态管理库。

## 理由

| 因素 | Zustand | Redux | Jotai | Recoil |
|------|---------|-------|-------|--------|
| **包体积** | ~3KB ✅ | ~15KB | ~2KB | ~5KB |
| **TypeScript** | 优秀 ✅ | 良好 | 优秀 | 良好 |
| **样板代码** | 极少 ✅ | 多 | 少 | 少 |
| **DevTools** | 支持 | 强大 | 基础 | 基础 |
| **持久化** | 灵活 ✅ | 需中间件 | 需库 | 需库 |
| **学习曲线** | 低 ✅ | 高 | 中 | 中 |

**关键优势**:
1. **Slice 工厂模式**：`createXxxSlice(adapter, callbacks)` 统一签名
2. **无 Provider**：直接 `useStore()`，无嵌套
3. **精确订阅**：`useShallow` 避免多余重渲染
4. **与 SQLite 配合**：`persistChange` 在 action 中直接调用

## 后果

### 正面
- 开发效率高（减少 70% 样板代码）
- 包体积小（节省 ~12KB）
- 学习成本低（新成员 1 天上手）

### 负面
- 无 Redux DevTools 时间旅行（可用 Zustand DevTools 替代）
- 无内置异步处理（需手动 async/await）

## 参考资料
- [Zustand 官方文档](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [本项目 Store 架构](../architecture/state-management.md)
