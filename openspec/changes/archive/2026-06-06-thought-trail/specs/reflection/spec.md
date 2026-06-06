## MODIFIED Requirements

### Requirement: 感念数据模型

感念数据模型 SHALL 支持关联到思路脉络。

#### Scenario: 新增 thoughtTrailIds 字段
- **WHEN** 感念被关联到思路脉络
- **THEN** MindReflection 的 thoughtTrailIds 字段包含该思路脉络的 ID

#### Scenario: 字段可选性
- **WHEN** 感念未关联到任何思路脉络
- **THEN** thoughtTrailIds 字段为 undefined 或空数组

#### Scenario: 支持多条思路脉络
- **WHEN** 感念关联到多条思路脉络
- **THEN** thoughtTrailIds 字段包含所有关联的思路脉络 ID

#### Scenario: 向后兼容
- **WHEN** 读取旧数据（无 thoughtTrailIds 字段）
- **THEN** 系统正常运行，字段值为 undefined
