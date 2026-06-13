## ADDED Requirements

### Requirement: 修复 AI 服务实例化
系统 SHALL 使用 `getAIService()` 而非 `AIService.getInstance()` 获取 AI 服务实例。

#### Scenario: AI 洞察正常生成
- **WHEN** 用户点击"生成洞察"按钮
- **THEN** 系统成功调用 AI 服务，不抛出 TypeError

### Requirement: AI 生成支持取消
系统 SHALL 为 AI 洞察和复盘生成提供 AbortController，支持用户取消进行中的请求。

#### Scenario: 用户取消生成
- **WHEN** AI 正在生成洞察时用户点击取消
- **THEN** 请求被中止，loading 状态结束，不更新缓存

#### Scenario: 页面离开时自动取消
- **WHEN** 用户在 AI 生成中导航离开详情页
- **THEN** 未完成的 AI 请求自动取消

### Requirement: AI 生成后自动展开
系统 SHALL 在 AI 洞察/复盘生成完成后自动展开结果区域。

#### Scenario: 生成完成后展开
- **WHEN** AI 洞察生成完成且成功
- **THEN** 洞察区域自动展开显示摘要和要点

### Requirement: 缓存过期检测
系统 SHALL 检测 AI 缓存是否过期。当脉络新增感念或笔记后，缓存的 `generatedAt` 与脉络最后修改时间比较，标记过期。

#### Scenario: 新增感念后缓存过期
- **WHEN** 用户向脉络添加新感念后查看洞察
- **THEN** 系统显示"已有洞察（可能已过期）"提示，并提供重新生成入口
