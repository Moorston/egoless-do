## MODIFIED Requirements

### Requirement: 筛选面板交互

筛选面板 SHALL 改为底部抽屉样式。

#### Scenario: 打开筛选面板
- **WHEN** 用户点击筛选按钮
- **THEN** 从底部弹出筛选抽屉

#### Scenario: 标签筛选
- **WHEN** 筛选面板打开
- **THEN** 显示可滚动的标签药丸列表

#### Scenario: 心情筛选
- **WHEN** 筛选面板打开
- **THEN** 显示可滚动的心情药丸列表

#### Scenario: 更多筛选选项
- **WHEN** 筛选面板打开
- **THEN** 显示更多筛选选项（有链接、已置顶、时间范围）

#### Scenario: 应用筛选
- **WHEN** 用户点击应用按钮
- **THEN** 应用筛选条件并关闭抽屉

#### Scenario: 拖拽关闭
- **WHEN** 用户向下拖拽筛选面板
- **THEN** 关闭筛选抽屉

### Requirement: 顶部标签栏

顶部标签栏 SHALL 改为可滚动药丸样式。

#### Scenario: 可滚动标签栏
- **WHEN** 显示顶部标签栏
- **THEN** 标签以水平滚动的方式显示

#### Scenario: 点击切换筛选
- **WHEN** 用户点击标签药丸
- **THEN** 切换该标签的筛选状态

#### Scenario: 长按快速筛选
- **WHEN** 用户长按标签药丸
- **THEN** 清除其他筛选，只筛选该标签
