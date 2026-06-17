## 1. 类型扩展与常量更新

- [x] 1.1 扩展 NodeType 为 5 种类型，更新 NODE_COLORS、NODE_LABELS、NODE_ICONS 映射表
- [x] 1.2 新增 EDGE_STYLES 映射表，定义各关系类型的颜色、线型和标签
- [x] 1.3 扩展 RelationContext 类型支持 'trail' 和 'planItem'

## 2. 关系图构建逻辑

- [x] 2.1 实现 trail 入口的上下文过滤：通过 reflectionIds 和 linkedPlanItemIds 构建关联节点
- [x] 2.2 实现 planItem 入口的上下文过滤：通过 reflectionId、trailId、linkConfig.habitId 构建关联节点
- [x] 2.3 添加节点数量限制（最多 20 个），按关联度排序截断
- [x] 2.4 优化节点查找：将 nodes.find() 替换为 Map 查找

## 3. 力导向模拟优化

- [x] 3.1 将 setInterval 替换为 requestAnimationFrame
- [x] 3.2 实现稳定检测：总动能低于阈值时停止模拟
- [x] 3.3 拖拽时重新启动模拟

## 4. 手势交互

- [x] 4.1 实现 PanResponder 单指拖拽平移画布
- [x] 4.2 实现 PanResponder 两指捏合缩放
- [x] 4.3 将 zoom/translate 应用到 graphContainer 的 transform
- [x] 4.4 设置平移和缩放的边界限制

## 5. 边渲染优化

- [x] 5.1 根据 EDGE_STYLES 渲染不同颜色和线型的边
- [x] 5.2 在边中点显示关系类型标签

## 6. 节点渲染优化

- [x] 6.1 节点显示 emoji 图标 + 截断文本标签
- [x] 6.2 中心节点高亮（放大 1.2 倍 + 白色边框）

## 7. 入口页面更新

- [x] 7.1 在 ThoughtTrailDetailScreen 添加"关系全景图"按钮
- [x] 7.2 在计划任务详情区域添加"关系全景图"按钮

## 8. 洞察增强

- [x] 8.1 扩展 generateInsights 支持 trail 和 planItem 入口类型的洞察生成
