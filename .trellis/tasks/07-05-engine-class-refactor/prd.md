# AR-09: Engine 类拆分

## Goal

将三个修行引擎（BreathingEngine 940行 / SleepEngine 1001行 / MantraEngine 624行）拆分为独立的 Timer / Audio / UI 子模块，主文件降至 400 行以下。

## Requirements

1. 每个 Engine 拆分为自定义 Hooks + 子组件的组合模式
2. 主文件控制在 **400 行以内**，各子模块控制在 **200 行以内**
3. 保持功能行为完全不变（零 UI 回归）
4. 新增拆分出的 Hooks 的单元测试

### SleepEngine (1001→<500)

- `useBarrierTimer.ts` — barrier 定时器 + 离屏检测 + AppState 监听
- `useSleepDiary.ts` — 日记表单状态 + 感恩列表逻辑
- `DiaryModal.tsx` — 日记表单 UI（quality 评分 + gratitude 列表 + noteText）
- `BarrierGlow.tsx` — 呼吸光晕动画组件

### BreathingEngine (940→<500)

- `useBreathTimer.ts` — rAF 循环 + 相位管理 + 暂停/恢复逻辑（核心）
- `useBreathSettings.ts` — guideStyle/voice/cue 持久化
- `BreathCountdown.tsx` — 倒计时动画
- `BreathActivePanel.tsx` — 活跃期 UI（cycle 指示 + 进度条 + 长按逻辑）
- `BreathReportPage.tsx` — 报告页（统计 + 反思 + 保存）

### MantraEngine (624→<400)

- `useMantraTimer.ts` — 计时/计数/暂停逻辑 + 完成判断
- `MantraSelectPage.tsx` — 选择经咒页（搜索 + 列表 + 管理）
- `MantraActivePage.tsx` — 活跃页（MalaRing + 暂停 + 取消）
- `MantraReportPage.tsx` — 报告页（统计 + 回向 + 关闭）

## Acceptance Criteria

- [ ] `wc -l` 检查：主文件 <500 行，各子模块 <200 行
- [ ] `pnpm tsc` 类型检查通过
- [ ] `pnpm test` 全部通过（含新增单元测试）
- [ ] 手动运行 App，三个引擎的完整流程（准备→活跃→报告）功能无变化
- [ ] `useBreathTimer` 纯逻辑单元测试
- [ ] `useBarrierTimer` 离屏检测 + 超时测试
- [ ] `useMantraTimer` 计时 + 暂停测试

## Notes

- 按 AGENTS.md §AR-09 实施，工作量预估 5 天
- BreathingEngine 最难拆分（rAF 循环 + 5 个 ref 联动），优先级最高
- MantraEngine 已经较小，拆分风险最低，建议第一个处理
