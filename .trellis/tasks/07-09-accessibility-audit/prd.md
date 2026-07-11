# 无障碍审查

## Goal

审查 React Native 组件的无障碍（Accessibility）支持，确保残障用户可以正常使用应用。

## Requirements

- 检查所有交互组件是否有 `accessibilityLabel`、`accessibilityRole`
- 检查颜色对比度是否满足 WCAG AA 标准
- 检查触摸目标尺寸是否 >= 44x44pt
- 检查屏幕阅读器（TalkBack/VoiceOver）支持
- 检查动态字体大小支持
- 产出审查报告，按 P0/P1/P2/P3 分级

## Acceptance Criteria

- [ ] 所有交互组件有 accessibilityLabel
- [ ] 颜色对比度满足 WCAG AA
- [ ] 触摸目标 >= 44x44pt
- [ ] 屏幕阅读器可正常导航
- [ ] 审查报告产出

## Scope

重点审查高频屏幕：HomeScreen, DietScreen, ExerciseScreen, SettingsScreen
