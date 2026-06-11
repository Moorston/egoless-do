# 关系全景图实现计划

## 当前状态

### 已完成的功能
- [x] 感念（Reflection）基础功能
- [x] 意图（Intent）基础功能
- [x] 计划（Plan）基础功能
- [x] 习惯（Habit）基础功能
- [x] 脉络（ThoughtTrail）基础功能
- [x] 打卡（Checkin）基础功能
- [x] AI设置页面

### 待实现的功能
- [ ] 关系全景图页面
- [ ] 习惯详情页
- [ ] 各模块入口
- [ ] AI关联分析

---

## 实现步骤

### 第一阶段：入口设计

#### 1.1 计划详情页入口
- 文件：`apps/mobile/src/features/plan/PlanDetailContent.tsx`
- 位置：底部打卡热力图上方
- 操作：添加「查看关系」按钮

#### 1.2 习惯详情页
- 新建文件：`apps/mobile/src/features/habits/HabitDetailScreen.tsx`
- 功能：
  - 习惯基本信息（名称、状态、连续天数）
  - 打卡历史（热力图）
  - 关联的感念和意图
  - 关系全景图入口

#### 1.3 习惯长按菜单入口
- 文件：`apps/mobile/src/features/habits/HabitsScreen.tsx`
- 操作：长按弹出底部菜单，添加「查看详情」选项

#### 1.4 感念详情页入口
- 文件：`apps/mobile/src/features/reflections/ReflectionsScreen.tsx`
- 位置：感念详情弹窗
- 操作：添加「查看关系」按钮

---

### 第二阶段：布局算法分析

#### 2.1 力导向布局（Force-Directed Layout）
- 原理：模拟物理力学，节点间有斥力，连线有引力
- 优点：自动分散，避免重叠，视觉美观
- 缺点：计算复杂度高，大数据量时性能差
- 适用：中小规模图谱

#### 2.2 层次布局（Hierarchical Layout）
- 原理：按层级排列节点，父节点在上，子节点在下
- 优点：结构清晰，易于理解
- 缺点：不适合网状结构
- 适用：树状结构

#### 2.3 环形布局（Circular Layout）
- 原理：节点排列在圆环上
- 优点：节省空间，适合展示环状关系
- 缺点：节点多时拥挤
- 适用：环状关系

#### 2.4 网格布局（Grid Layout）
- 原理：节点排列在网格中
- 优点：整齐有序，易于查找
- 缺点：浪费空间
- 适用：分类展示

#### 2.5 时间轴布局（Timeline Layout）
- 原理：按时间顺序排列节点
- 优点：展示时间维度的关系
- 缺点：空间利用率低
- 适用：时间序列数据

#### 推荐方案
- 主布局：力导向布局（默认）
- 辅助布局：层次布局、时间轴布局
- 用户可切换布局方式

---

### 第三阶段：虚拟化渲染

#### 3.1 技术方案
- 使用 `react-native-svg` 渲染图谱
- 实现视口裁剪，只渲染可见区域
- 使用 `react-native-reanimated` 实现动画

#### 3.2 性能优化
- 节点聚合：远距离节点合并显示
- 层级细节：根据缩放级别显示不同细节
- 异步计算：布局计算放到后台线程

---

### 第四阶段：AI关联分析

#### 4.1 关联发现
- 分析感念内容，发现潜在关联
- 识别相似主题的感念
- 检测情绪变化模式

#### 4.2 闭环检测
- 检测「感念→意图→行动→反馈」闭环
- 识别完整的成长路径
- 发现断裂的链条

#### 4.3 智能建议
- 基于历史关联推荐新关联
- 预测意图成功的可能性
- 建议优化行动方案

---

## 文件清单

### 新建文件
1. `apps/mobile/src/features/habits/HabitDetailScreen.tsx` - 习惯详情页
2. `apps/mobile/src/features/reflections/RelationMapView.tsx` - 关系全景图页面
3. `apps/mobile/src/components/relation/RelationGraph.tsx` - 关系图谱组件
4. `apps/mobile/src/components/relation/ForceLayout.tsx` - 力导向布局算法
5. `apps/mobile/src/components/relation/RelationInsights.tsx` - 关联洞察组件

### 修改文件
1. `apps/mobile/src/features/plan/PlanDetailContent.tsx` - 添加入口
2. `apps/mobile/src/features/habits/HabitsScreen.tsx` - 添加长按菜单
3. `apps/mobile/src/features/reflections/ReflectionsScreen.tsx` - 添加入口
4. `apps/mobile/src/navigation/index.tsx` - 注册新路由

---

## 风险评估

### 技术风险
- 力导向布局计算复杂度高，需要优化
- 虚拟化渲染实现复杂
- AI分析可能产生不准确的结果

### 时间风险
- 功能较多，需要分阶段实现
- 测试覆盖需要充分

### 缓解措施
- 优先实现核心功能
- 使用成熟的布局算法库
- AI分析作为辅助，不强制依赖

---

## 验收标准

### 功能验收
- [ ] 计划详情页有关系入口
- [ ] 习惯详情页完整可用
- [ ] 习惯长按菜单有查看详情选项
- [ ] 感念详情页有关系入口
- [ ] 关系全景图页面可正常显示
- [ ] 支持至少两种布局算法
- [ ] AI关联分析可正常工作

### 性能验收
- [ ] 100个节点渲染流畅
- [ ] 缩放操作流畅
- [ ] 内存占用合理

### 质量验收
- [ ] 无 TypeScript 错误
- [ ] 所有测试通过
- [ ] 代码符合项目规范
