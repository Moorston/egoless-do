## 1. 搜索流程改造

- [x] 1.1 修改 `handleLocalSearch`：输入后只执行 Phase 1 RAG 本地检索，不自动触发 AI（`apps/mobile/src/features/reflections/QuickCreateTrailScreen.tsx`）
- [x] 1.2 移除搜索按钮点击时自动触发 `handleSmartQuery` 的逻辑，改为仅调用 `handleLocalSearch`
- [x] 1.3 新增 `handleAISearch` 函数：封装 Phase 2 + Phase 3 逻辑，将 AI 结果追加到本地结果后面（extended 标记）

## 2. AI 按钮 UI

- [x] 2.1 新增 AI 搜索悬浮按钮组件：左下角定位，Sparkles 图标 + "AI 搜索" 文字标签
- [x] 2.2 实现按钮显示/隐藏逻辑：搜索输入框有内容时显示，为空时隐藏
- [x] 2.3 实现按钮加载状态：AI 搜索执行中显示加载动画，不可重复点击
- [x] 2.4 按钮点击调用 `handleAISearch`

## 3. 筛选条件注入搜索框

- [x] 3.1 修改下拉框（时间/标签/心情）选中回调：选中后将文字注入搜索输入框
- [x] 3.2 实现多条件空格拼接逻辑：多个筛选条件用空格分隔
- [x] 3.3 确保注入后不自动触发搜索，用户需点击搜索按钮

## 4. i18n 与样式

- [x] 4.1 添加 AI 按钮相关翻译 key（aiSearchButton、aiSearching 等）
- [x] 4.2 添加 AI 按钮样式（悬浮定位、加载动画）
