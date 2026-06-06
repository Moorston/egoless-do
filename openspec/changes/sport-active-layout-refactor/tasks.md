## 1. Hooks 提取

- [ ] 1.1 创建 `hooks/useExerciseTimer.ts` — 提取计时器启停、暂停恢复、秒表逻辑
- [ ] 1.2 创建 `hooks/useExerciseAudio.ts` — 提取环境音播放、事件音效、音效选择持久化
- [ ] 1.3 创建 `hooks/useExerciseRest.ts` — 提取休息倒计时、自动跳转下一组
- [ ] 1.4 创建 `hooks/useExerciseSets.ts` — 提取组管理、当前组次数、组历史、完成组逻辑
- [ ] 1.5 创建 `hooks/useExerciseTargets.ts` — 提取目标进度、软目标计算、里程碑检测

## 2. 共享组件拆分

- [ ] 2.1 创建 `shared/ExerciseTopBar.tsx` — 顶部状态栏（运动名+图标+目标信息+音效按钮）
- [ ] 2.2 创建 `shared/ExerciseBottomBar.tsx` — 底部操作栏（根据布局类型渲染不同按钮组合）
- [ ] 2.3 创建 `shared/SoundPicker.tsx` — 音效选择器（可展开的标签列表）
- [ ] 2.4 创建 `shared/RestOverlay.tsx` — 全屏休息 overlay（力量型，SVG 环形倒计时）
- [ ] 2.5 创建 `shared/EmbeddedRest.tsx` — 嵌入式休息条（间歇型，主区内进度条）
- [ ] 2.6 创建 `shared/CelebrationOverlay.tsx` — 目标达成庆祝动画+里程碑 toast

## 3. 布局组件实现

- [ ] 3.1 创建 `layouts/MeditativeActive.tsx` — 冥想型沉浸式布局（呼吸引导+时长+2按钮底栏）
- [ ] 3.2 创建 `layouts/EnduranceActive.tsx` — 耐力型仪表盘布局（1+2+2 数据网格+3按钮底栏）
- [ ] 3.3 创建 `layouts/StrengthActive.tsx` — 力量型操作台布局（主数字+组历史+进度条+信息底栏）
- [ ] 3.4 创建 `layouts/IntervalActive.tsx` — 间歇型混合布局（操作台+嵌入式休息条+信息底栏）

## 4. 页面组件拆分

- [ ] 4.1 创建 `pages/PrepPage.tsx` — 从 SportPage.tsx 提取准备页逻辑
- [ ] 4.2 创建 `pages/CountdownPage.tsx` — 从 SportPage.tsx 提取倒计时页逻辑
- [ ] 4.3 创建 `pages/PausedPage.tsx` — 从 SportPage.tsx 提取暂停页逻辑（含数据摘要+3按钮+音效控制）
- [ ] 4.4 创建 `pages/ReportPage.tsx` — 从 SportPage.tsx 提取报告页逻辑

## 5. 路由层重构

- [ ] 5.1 重构 `SportPage.tsx` 为路由层 — 仅保留 hook 调用+页面分发+experienceType 切换
- [ ] 5.2 验证所有运动类型（meditative/endurance/strength/interval）的 active 页面正确渲染
- [ ] 5.3 验证 prep→countdown→active→paused→report 完整流程无回归
