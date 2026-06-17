## ADDED Requirements

### Requirement: 关系类型化边渲染
系统 SHALL 根据关系类型使用不同的颜色和线型渲染边。

#### Scenario: 相关关系边
- **WHEN** 边类型为 'related'（感念-计划）
- **THEN** 边 SHALL 使用蓝色 (#3B82F6) 实线渲染

#### Scenario: 关联关系边
- **WHEN** 边类型为 'linked'（习惯-计划）
- **THEN** 边 SHALL 使用琥珀色 (#F59E0B) 实线渲染

#### Scenario: 感念间链接边
- **WHEN** 边类型为 'inspire' | 'evolve' | 'contrast' | 'respond'（感念间链接）
- **THEN** 边 SHALL 使用紫色 (#8B5CF6) 虚线渲染

#### Scenario: 同标签关系边
- **WHEN** 边类型为 'same_tag'
- **THEN** 边 SHALL 使用灰色 (#9CA3AF) 点线渲染

#### Scenario: 包含关系边
- **WHEN** 边类型为 'contains'（脉络包含感念）
- **THEN** 边 SHALL 使用青色 (#06B6D4) 实线渲染

### Requirement: 边标签显示
每条边 SHALL 显示关系类型标签。

#### Scenario: 边标签渲染
- **WHEN** 边被渲染
- **THEN** 边中点 SHALL 显示对应关系类型的文字标签（如"相关"、"关联"、"包含"）

### Requirement: 边样式配置
边样式 SHALL 使用统一的配置映射表。

#### Scenario: 边样式映射
- **WHEN** 系统需要渲染边
- **THEN** SHALL 从 EDGE_STYLES 映射表中获取对应的颜色、线型和标签

### Requirement: 节点显示优化
节点 SHALL 显示 emoji 图标和截断的文本标签。

#### Scenario: 节点标签显示
- **WHEN** 节点被渲染
- **THEN** 节点圆圈内 SHALL 显示 emoji 图标，圆圈下方 SHALL 显示截断为 8 字符的文本标签

#### Scenario: 中心节点高亮
- **WHEN** 节点是上下文中心节点
- **THEN** 节点 SHALL 放大 1.2 倍，白色边框 4px

### Requirement: 关联洞察增强
系统 SHALL 分析节点间关系类型并生成更丰富的洞察文本。

#### Scenario: 思维脉络入口洞察
- **WHEN** 入口类型为 'trail'
- **THEN** 洞察 SHALL 包含脉络包含的感念数量和关联的计划任务数量

#### Scenario: 计划任务入口洞察
- **WHEN** 入口类型为 'planItem'
- **THEN** 洞察 SHALL 包含任务关联的实体类型和数量
