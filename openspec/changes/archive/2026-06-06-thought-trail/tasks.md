## 1. 数据模型变更 (packages/core)

- [x] 1.1 创建 `packages/core/src/types/thought-trail.ts`，定义 ThoughtTrail 接口
- [x] 1.2 修改 `packages/core/src/types/reflection.ts`，MindReflection 新增 thoughtTrailIds 字段
- [x] 1.3 修改 `packages/core/src/types/app.ts`，AppState 新增 thoughtTrails 字段
- [x] 1.4 添加 i18n 翻译键：mindTrail, thoughtTrail, tagTrail, createThoughtTrail 等

## 2. Store 实现 (packages/core)

- [x] 2.1 创建 `packages/core/src/store/createThoughtTrailSlice.ts`，实现 thoughtTrails 状态和操作
- [x] 2.2 实现 createThoughtTrail action（创建思路脉络）
- [x] 2.3 实现 updateThoughtTrail action（更新思路脉络）
- [x] 2.4 实现 deleteThoughtTrail action（删除思路脉络）
- [x] 2.5 实现 addReflectionToTrail action（添加感念到思路脉络）
- [x] 2.6 实现 removeReflectionFromTrail action（从思路脉络移除感念）
- [x] 2.7 实现 reorderTrailReflections action（调整思路脉络中感念顺序）
- [x] 2.8 修改 MindReflection 相关 action，同步更新 thoughtTrailIds

## 3. 业务逻辑 (packages/core)

- [x] 3.1 创建 `packages/core/src/business/thought-trail.ts`，实现自动命名逻辑
- [x] 3.2 实现 getTrailStats 函数（计算感念数量、时间跨度、心情变化）
- [x] 3.3 实现 getTrailsByReflection 函数（查询感念所属的思路脉络）
- [x] 3.4 实现 getReflectionsByTag 函数（按标签聚合感念）

## 4. 思路脉络页面 (apps/mobile)

- [x] 4.1 创建 `apps/mobile/src/features/reflections/MindTrailScreen.tsx`，思维脉络主页面
- [x] 4.2 实现 Tab 切换（思路脉络 / 标签脉络）
- [x] 4.3 创建 `apps/mobile/src/features/reflections/ThoughtTrailTab.tsx`，思路脉络视图
- [x] 4.4 创建 `apps/mobile/src/features/reflections/TagTrailTab.tsx`，标签脉络视图
- [x] 4.5 创建 `apps/mobile/src/features/reflections/ThoughtTrailCard.tsx`，思路脉络卡片组件

## 5. 思路脉络详情页 (apps/mobile)

- [x] 5.1 创建 `apps/mobile/src/features/reflections/ThoughtTrailDetailScreen.tsx`，详情页
- [x] 5.2 实现感念列表展示（按时间排序）
- [x] 5.3 实现添加感念功能（显示感念选择器）
- [x] 5.4 实现移除感念功能
- [x] 5.5 实现编辑思路脉络功能（修改名称和描述）
- [x] 5.6 实现删除思路脉络功能（带确认对话框）

## 6. 创建流程 (apps/mobile)

- [x] 6.1 创建 `apps/mobile/src/features/reflections/CreateThoughtTrailModal.tsx`，新建弹窗
- [x] 6.2 实现从感念详情页创建流程（选择已有/新建）
- [x] 6.3 实现从思维脉络页面创建流程（输入名称 + 选择感念）
- [x] 6.4 实现自动命名逻辑（优先标签，备选内容前 20 字）

## 7. 标签脉络功能 (apps/mobile)

- [x] 7.1 实现标签列表展示（按感念数量降序）
- [x] 7.2 实现标签下感念列表展示
- [x] 7.3 实现"创建为思路脉络"功能

## 8. 导航集成 (apps/mobile)

- [x] 8.1 修改 `apps/mobile/src/navigation/types.ts`，新增 MindTrail 路由类型
- [x] 8.2 修改 `apps/mobile/src/navigation/index.tsx`，注册 MindTrail 路由
- [x] 8.3 修改感念页面，添加"思维脉络" Tab 入口

## 9. 思维脉络入口卡片 (apps/mobile)

- [x] 9.1 创建 `apps/mobile/src/features/reflections/MindTrailEntryCard.tsx`，入口卡片组件
- [x] 9.2 实现卡片样式：浅色背景 + 左侧紫色装饰条
- [x] 9.3 实现双行布局：标题（思维脉络）+ 描述（追踪思路演变 · X 条脉络）
- [x] 9.4 实现状态处理：有脉络时显示数量，无脉络时显示引导文案
- [x] 9.5 实现点击交互：点击卡片导航到 MindTrail 页面
- [x] 9.6 修改 `apps/mobile/src/features/reflections/ReflectionsScreen.tsx`，在搜索框上方添加入口卡片

## 10. 测试与验证

- [x] 10.1 测试创建思路脉络（两种方式）
- [x] 10.2 测试添加/移除感念
- [x] 10.3 测试调整感念顺序
- [x] 10.4 测试删除思路脉络
- [x] 10.5 测试标签脉络视图
- [x] 10.6 测试自动命名逻辑
- [x] 10.7 测试思维脉络入口卡片显示和交互
