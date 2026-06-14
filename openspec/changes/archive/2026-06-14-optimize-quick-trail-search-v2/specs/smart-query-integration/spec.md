# smart-query-integration Specification (Delta)

## ADDED Requirements

### Requirement: 筛选条件注入搜索框

系统 SHALL 在用户选择筛选条件（时间/标签/心情）后，将选中内容的文字注入搜索输入框。

#### Scenario: 单个筛选条件注入
- **WHEN** 用户在下拉框中选择一个筛选条件（如"最近一周"）
- **THEN** 将选中条件的文字注入搜索输入框
- **AND** 不自动触发搜索

#### Scenario: 多个筛选条件注入
- **WHEN** 用户选择多个筛选条件
- **THEN** 将所有选中条件的文字用空格拼接后注入搜索输入框
- **AND** 不自动触发搜索

#### Scenario: 下拉框保留快捷选择功能
- **WHEN** 用户打开下拉框
- **THEN** 下拉框仍显示预设选项列表
- **AND** 选中后同时高亮选项 + 注入文字到搜索框

#### Scenario: 用户可编辑注入的文字
- **WHEN** 筛选条件文字已注入搜索框
- **THEN** 用户可以在搜索框中编辑、删除或追加文字
- **AND** 点击搜索按钮后触发搜索
