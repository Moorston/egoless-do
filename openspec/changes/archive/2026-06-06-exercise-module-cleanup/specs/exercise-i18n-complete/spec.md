## ADDED Requirements

### Requirement: 运动模块硬编码中文国际化

运动模块中所有面向用户的中文字符串 MUST 通过 i18n `T()` 函数获取，不得硬编码。

涉及文件和字符串：
- `RestOverlay.tsx`: "休息中", "跳过休息", "第X组", "次"
- `PrepPage.tsx`: "背景音效", "呼吸引导"
- `EnduranceActive.tsx`: "总消耗 kcal", "总时长", "爬升高度", "层数", "实时心率"
- `PausedPage.tsx`: "运动时间过短", "本次运动时间过短，无法保存记录，确定结束吗？"
- `StrengthActive.tsx`: "完成本组", "次", "时长"
- `EmbeddedRest.tsx`: "跳过休息"
- `CelebrationOverlay.tsx`: 如有硬编码中文

#### Scenario: RestOverlay 字符串国际化
- **WHEN** 渲染 RestOverlay 组件
- **THEN** "休息中" 等字符串从 `T('exerciseResting')` 获取

#### Scenario: EnduranceActive 字符串国际化
- **WHEN** 渲染 EnduranceActive 组件
- **THEN** 所有数据标签从 i18n 获取，不再硬编码

#### Scenario: Alert 对话框字符串国际化
- **WHEN** 暂停页弹出运动时间过短确认框
- **THEN** 标题和按钮文本从 i18n 获取
