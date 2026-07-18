# Research: iOS "Text strings must be rendered within a <Text>" 调试总结

## 问题
iOS 真机报错 `Text strings must be rendered within a <Text> component`，栈帧 `BodyDashboard (BodyScreen.bundle:320274)`。

## 关键发现

### 1. Metro 缓存陷阱
- 偏移量 320274 在 10+ 次提交中**完全不变**，无论怎么改 BodyDashboard.tsx
- 添加注释、换行、`touch` 都**不触发 Babel 重新编译**
- 仅当添加真正的 JS 表达式（如 `const _FB = Date.now()`）时偏移量变 320275/320276
- **结论**：Metro 缓存的是 Babel 输出，不是源文件内容

### 2. ESLint 规则有效
- 新增 `local/no-raw-number-in-text` 规则成功捕捉所有裸数字 `<Text>{n}</Text>`
- 全 repo 修复 17+ 处违规（BodyDashboard、HomeScreen、FoodLogPage、Modals 等）

### 3. 根因未定位
- 所有 `String()` 修复后错误依旧
- RENDER_START + RENDER_END 都触发 → 错误在 reconciliation 阶段，非 JSX 求值
- 删除训练计划卡片后错误仍存在
- 无法通过静态分析或二分法定位到具体代码行

## 推测
- React Native 0.81.5 iOS 在特定组件树（含多个条件渲染 `<Modal visible={false}>`）下的 reconciliation bug
- 可能是 Hermes dev 模式（`ReactFabric-dev.js`）的 false positive

## 行动建议
1. **production build 测试**：`npx expo run:ios --configuration Release`
2. **升级 React Native**：0.81.5 → 最新版可能修复
3. **不阻塞上线**：dev 模式的错误，production 可能不出现

## 调试教训
| 错误行为 | 真相 |
|---------|------|
| 改代码后错误不变 | Metro 缓存，bundle 未重建 |
| 添加注释/空行无效 | Babel 输出未变 |
| 栈帧偏移不变 | **验证 bundle 重建**应作为 debug 第一步 |
| 删除代码后错误仍在 | 错误不在被删代码中，或在缓存里 |
