## ADDED Requirements

### Requirement: 洞察摘要自动预填计划
系统 SHALL 在创建计划时从脉络洞察摘要自动预填计划名称和描述。

#### Scenario: 创建计划预填
- **WHEN** 用户从脉络创建计划
- **THEN** 计划名称和描述自动填入洞察摘要内容，用户可修改后确认

### Requirement: 已关联任务的感念标记
系统 SHALL 在 TimelineList 中标记已创建计划的感念。

#### Scenario: 感念显示计划标记
- **WHEN** TimelineList 中的某个感念已关联到计划任务
- **THEN** 该感念卡片显示 📋 标记

### Requirement: 一键脉络转为计划
系统 SHALL 支持将整个脉络一键转化为计划项目。

#### Scenario: 脉络转计划
- **WHEN** 用户选择"将脉络转为计划"
- **THEN** 创建新的计划项，脉络名称和描述作为计划的基础信息
