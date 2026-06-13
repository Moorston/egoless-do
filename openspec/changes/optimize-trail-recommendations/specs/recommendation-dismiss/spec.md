## ADDED Requirements

### Requirement: 忽略推荐时完全移除而非降分
当用户点击推荐卡片的关闭按钮时，系统 SHALL 将该推荐的忽略 key 存入本地存储，并在后续推荐中完全移除匹配的推荐，MUST NOT 仅降低分数。

#### Scenario: 用户关闭推荐后不再出现
- **WHEN** 用户关闭一条推荐（类型为 mood，包含感念 [a, b, c]）
- **THEN** 系统将 `mood:<hash(a,b,c)>` 存入 AsyncStorage
- **AND** 后续推荐中，包含相同感念集合的 mood 类型推荐 MUST NOT 出现

#### Scenario: 不同感念集合的同类型推荐不受影响
- **WHEN** 用户关闭了一条包含感念 [a, b, c] 的 mood 推荐
- **AND** 新的推荐包含感念 [d, e, f] 且类型为 mood
- **THEN** 新推荐 MUST 正常展示，不受之前忽略的影响

### Requirement: 忽略 key 基于感念 ID 集合哈希
系统 SHALL 使用推荐中感念 ID 排序后的集合作为哈希输入，生成忽略 key。格式为 `type:hash`。

#### Scenario: 相同感念集合生成相同 key
- **WHEN** 推荐 A 包含感念 [id1, id2, id3]，推荐 B 包含感念 [id3, id1, id2]
- **THEN** 两者生成的忽略 key 相同

#### Scenario: 不同感念集合生成不同 key
- **WHEN** 推荐 A 包含感念 [id1, id2]，推荐 B 包含感念 [id1, id3]
- **THEN** 两者生成的忽略 key 不同

### Requirement: 忽略记录存储在本地 AsyncStorage
系统 SHALL 将忽略记录存储在 AsyncStorage 中，key 为 `trailIgnoredPatterns`，值为 JSON 字符串数组。MUST NOT 通过 PocketBase 同步到其他设备。

#### Scenario: 忽略记录持久化
- **WHEN** 用户关闭一条推荐
- **THEN** 忽略 key 被写入 AsyncStorage
- **AND** 重启 app 后该推荐仍然不会出现

#### Scenario: 忽略记录不同步到其他设备
- **WHEN** 用户在设备 A 上关闭一条推荐
- **THEN** 设备 B 上该推荐仍然正常展示

### Requirement: applyUserPreferences 完全移除匹配推荐
`applyUserPreferences` 函数 SHALL 完全移除匹配忽略模式的推荐，MUST NOT 仅降低分数。

#### Scenario: 匹配的推荐被移除
- **WHEN** 推荐列表包含 [A, B, C]，其中 A 匹配某个忽略模式
- **THEN** 返回的推荐列表为 [B, C]

#### Scenario: 无匹配时返回完整列表
- **WHEN** 推荐列表包含 [A, B, C]，无匹配忽略模式
- **THEN** 返回的推荐列表为 [A, B, C]
