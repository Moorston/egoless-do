# 调身页全面优化 — 执行计划

## 实施顺序

按 R1 → R2 → R3 → R4 顺序推进，每阶段完成后提交，可独立回滚。

---

## Phase 1: R1 — Dashboard 翻新 + Bug 修复

### 步骤

**1.1 修复已知 Bug（先清理）**
- [ ] 1.1a `BodyDashboard.tsx` — 添加 `updateBodyTrainingPlan` 到 store 解构
- [ ] 1.1b `packages/core/src/types/body.ts` — BodyGoal 增加 `initialWeight` / `initialBodyFat` 字段
- [ ] 1.1c `packages/core/src/business/body.ts` — 更新 `createBodyGoal` 适配新字段
- [ ] 1.1d `packages/core/src/store/createBodySlice.ts` — 适配新字段
- [ ] 1.1e `GoalCard.tsx` — 使用 `calcGoalProgress` 替代硬编码 0

**1.2 创建 CollapsibleSection 组件**
- [ ] 1.2a 创建 `body/components/CollapsibleSection.tsx`
- [ ] 1.2b 实现展开/折叠动画（Animated.timing 高度过渡）
- [ ] 1.2c 实现 Section header 渐变色 + 图标旋转

**1.3 重构 BodyScreen + BodyDashboard**
- [ ] 1.3a 重新组织 BodyDashboard 为 4 个 Section
- [ ] 1.3b 将 GoalCard 内容合并到 ProfileCard
- [ ] 1.3c 添加 Dashboard ↔ Flow 切换动画
- [ ] 1.3d 增强 BodyTodayPlanCard 动效

**验证：**
```bash
cd D:/MyProject/2026/egoless-do && pnpm run test -- --run
```

---

## Phase 2: R2 — BodyFlow 流程增强

### 步骤

**2.1 创建 useBodyFlowState hook**
- [ ] 2.1a 创建 `body/hooks/useBodyFlowState.ts`
- [ ] 2.1b 定义 BodyFlowPersistedState 接口
- [ ] 2.1c 集成到 createBodySlice（添加 bodyFlowState 字段）
- [ ] 2.1d 实现 24 小时过期逻辑

**2.2 重构 BodyFlow**
- [ ] 2.2a 使用 useBodyFlowState 替换内联状态
- [ ] 2.2b 分离 todayPlan 和 trainingPlanTask 逻辑
- [ ] 2.2c 添加步间过渡动画

**2.3 修改 SportPage 返回机制**
- [ ] 2.3a SportPage 完成后通过导航参数回传结果
- [ ] 2.3b BodyScreen 读取参数并更新 flow 状态

**2.4 修改 BreathingScreen 返回机制**
- [ ] 2.4a BreathingScreen 完成后通过导航参数回传结果
- [ ] 2.4b BodyScreen 读取参数并更新 flow 状态

**2.5 增强 CheckinSuccessCard**
- [ ] 2.5a 增加更多数据回顾
- [ ] 2.5b 增加鼓励语录

**验证：**
```bash
cd D:/MyProject/2026/egoless-do && pnpm run test -- --run
```

---

## Phase 3: R3 — 训练计划功能增强

### 步骤

**3.1 创建 TemplatePickerModal**
- [ ] 3.1a 创建 `body/modals/TemplatePickerModal.tsx`
- [ ] 3.1b 展示 4 个模板卡片（名称/描述/强度/图标）
- [ ] 3.1c 选中后填充编辑器字段

**3.2 修改 BodyPlanEditorScreen**
- [ ] 3.2a 添加「从模板导入」按钮
- [ ] 3.2b 集成 TemplatePickerModal
- [ ] 3.2c 实现模板→编辑器字段映射

**3.3 合并 BodyWeekPlanCard + WeeklyExecCard**
- [ ] 3.3a 将 WeeklyExecCard 的执行标记逻辑合并到 BodyWeekPlanCard
- [ ] 3.3b 删除 WeeklyExecCard
- [ ] 3.3c 更新所有引用

**3.4 创建 CelebrationOverlay**
- [ ] 3.4a 创建 `body/screens/CelebrationOverlay.tsx`
- [ ] 3.4b 实现粒子动画效果
- [ ] 3.4c 实现统计摘要展示

**3.5 集成计划完成检测**
- [ ] 3.5a BodyDashboard 检测计划完成
- [ ] 3.5b 自动触发庆祝动画

**验证：**
```bash
cd D:/MyProject/2026/egoless-do && pnpm run test -- --run
```

---

## Phase 4: R4 — SportPage 体验优化

### 步骤

**4.1 精简 PrepPage**
- [ ] 4.1a 按频率排序运动类型
- [ ] 4.1b 非 GPS 运动隐藏地图区域
- [ ] 4.1c 目标选择更紧凑

**4.2 增强 ReportPage**
- [ ] 4.2a 添加本次数据卡片面板
- [ ] 4.2b 添加 7 天历史对比柱状图
- [ ] 4.2c 添加卡路里占比环形进度条

**4.3 优化暂停/结束交互**
- [ ] 4.3a 大号继续按钮 + 小号结束按钮
- [ ] 4.3b 结束需要长按确认
- [ ] 4.3c 添加 haptic feedback

**验证：**
```bash
cd D:/MyProject/2026/egoless-do && pnpm run test -- --run
```

---

## 风险点

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| BodyFlow 重构引入回归 | 中 | 高 | 每个步骤单独提交，可回滚 |
| 导航参数回传机制破坏现有导航 | 低 | 高 | 先在小范围测试，保留旧路径 |
| 动画性能问题（低端设备） | 中 | 低 | 使用 Animated API 而非第三方库，可降级 |
| BodyGoal 类型变更影响同步 | 低 | 中 | 新字段为 optional，向后兼容 |

## 验证清单

在每个 Phase 完成后：
- [ ] TypeScript 编译通过（pnpm run type-check）
- [ ] 测试通过（pnpm run test）
- [ ] 手动验证 UI 渲染正确
- [ ] 无新增 console.log
- [ ] 无新增 any 类型