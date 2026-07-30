# 执行计划 — SleepSummaryCard 重构

## 1. 执行策略

采用**增量重构、分步验证**策略。每一步都保持 app 可运行，避免大爆炸式替换。

## 2. 任务清单

### Task 1：移除 editing 状态机，简化为两段式

**目标**：移除 `editing` / `draftQuality` / `draftWorkState` 状态，删除 Edit 分支渲染。

**改动文件**：`SleepSummaryCard.tsx`

**步骤**：
1. 删除 `useState` 声明的 3 个 editing 相关状态
2. 删除 `enterEditMode` / `handleCancel` / `handleSave` 回调
3. 删除 `if (editing) { ... }` 整个 Edit 分支
4. Read 模式的 ✎ 按钮改为调用 `onOpenFullDiary`（不再 `enterEditMode`）

**验证**：
- App 启动 → 进入调眠页 → 有数据时显示 Read 模式 → 点 ✎ 打开 DiaryModal
- 无数据时显示 Empty 模式

**回滚点**：git commit `refactor(sleep): remove editing state machine`

---

### Task 2：空态修复 — 去掉假星星

**目标**：Empty 态不再渲染 5 颗 disabled 星星，改为明确 CTA。

**改动文件**：`SleepSummaryCard.tsx`

**步骤**：
1. 空态分支移除 `renderStars(0, 28, false, enterEditMode)` 调用
2. 新增 CTA 按钮："记录昨晚睡眠"（主按钮样式）
3. 空态保留标题 + 日期 + CTA

**验证**：
- 空态无星星渲染
- 点击 CTA → 进入编辑流程（根据产品决策：直接调 `onSaveQuickDiary(3, null)` 进入默认编辑，或打开 DiaryModal）

**决策点**：空态 CTA 行为——
- 选项 A：点击 → 打开 DiaryModal（完整录入）
- 选项 B：点击 → 直接以默认 quality=3 创建记录，进入 Read 模式（轻量快记）

**推荐选项 B**（与"直接保存"理念一致，降低记录门槛）。实现时调 `onSaveQuickDiary(3, null)` 即可。

**回滚点**：git commit `fix(sleep): remove dummy stars in empty state`

---

### Task 3：质量星直接保存

**目标**：Read 模式下点击质量星 → 立即保存 quality。

**改动文件**：`SleepSummaryCard.tsx`、`HomePage.tsx`

**步骤**：
1. `SleepSummaryCard` 新增 `handleStarPress(i)` 回调
2. 质量星从 `disabled` 改为可点击，`onPress={() => handleStarPress(i)}`
3. `handleStarPress` 内部：
   - 读取 `currentWorkState = todaySleep?.workState ?? null`
   - 调 `onSaveQuickDiary(i, currentWorkState)`
   - 触发反馈（先占位，Task 6 实现）
4. `HomePage.tsx` 的 `onSaveQuickDiary` 传入函数：`(quality, workState) => saveSleepDiary({ quality, workState: workState === null ? undefined : workState })`

**验证**：
- Read 模式点击第 3 颗星 → quality 变为 3
- 检查 workState 未丢失（若原本有值）
- 检查 SQLite（通过 SleepHistoryPage 详情）确认 quality 已持久化

**回滚点**：git commit `feat(sleep): direct-save quality stars`

---

### Task 4：工作状态直接切换

**目标**：Read 模式下点击 chip → 立即保存/取消 workState。

**改动文件**：`SleepSummaryCard.tsx`

**步骤**：
1. 新增 `handleWorkStatePress(key)` 回调
2. chip 从展示态改为可点击（移除当前的 `renderWorkStateLabel`，改为始终渲染 chip 行）
3. `handleWorkStatePress` 内部：
   - `next = todaySleep?.workState === key ? null : key`
   - `quality = Math.max(1, todaySleep?.quality ?? 0)`（保底 1）
   - 调 `onSaveQuickDiary(quality, next)`
   - 触发反馈
4. 无论 `workState` 是否有值，都渲染 chip 行（Read 模式下 chip 始终可见、可点）

**验证**：
- 点击"疲惫" chip → workState 变为 'tired'
- 再次点击"疲惫" chip → workState 取消（null）
- 检查 quality 未丢失

**回滚点**：git commit `feat(sleep): direct-toggle work-state chips`

---

### Task 5：视觉层级重排

**目标**：质量星作为主视觉，时长降为辅助，加目标对比。

**改动文件**：`SleepSummaryCard.tsx`

**步骤**：
1. 布局重排：
   - 第一行：标题 + 日期 + diary 链接
   - 第二行：质量星（28px，主位置）
   - 第三行：质量文字（"好" / "一般" / "差" 等映射）
   - 第四行：时长 + 目标对比
   - 第五行：入睡 → 起床（图标替代 emoji）
   - 第六行：工作状态 chip
   - 第七行：仪轨 + 感恩
2. 新增质量文字映射函数（`sleepSummaryLogic.ts`）：
   ```ts
   export function qualityLabel(quality: number): string {
     if (quality >= 4) return '好';
     if (quality >= 3) return '一般';
     if (quality >= 2) return '偏差';
     return '差';
   }
   ```
3. 目标对比计算（见 design.md 5.3）
4. 时间行图标改为 `Moon` / `Sun`（来自 `lucide-react-native`）
5. 仪轨 badge 去掉 ✅ emoji

**验证**：
- 视觉走查：质量星为视觉焦点
- 目标对比计算正确（目标 8h，实睡 7h12m → 显示"差 48m"）
- 图标渲染正确（非 emoji）

**回滚点**：git commit `style(sleep): reorder visual hierarchy`

---

### Task 6：保存反馈（haptic + toast）

**目标**：每次成功保存触发 haptic + toast。

**改动文件**：`SleepSummaryCard.tsx`

**步骤**：
1. 新增 `triggerFeedback()` 工具函数：
   ```ts
   import * as Haptics from 'expo-haptics';
   import { useUiStore } from '../../store/uiStore';

   const triggerFeedback = () => {
     Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
     useUiStore.getState().showToast('已保存', 'success');
   };
   ```
2. 在 `handleStarPress` / `handleWorkStatePress` 成功后调用
3. 确认 `expo-haptics` 在 `package.json` 依赖中（若无，需安装）

**验证**：
- 点击星 → 手机震动 + toast 显示"已保存"
- 点击 chip → 同上

**回滚点**：git commit `feat(sleep): add haptic + toast feedback`

---

### Task 7：无障碍补齐

**目标**：所有交互元素有 a11y 属性。

**改动文件**：`SleepSummaryCard.tsx`

**步骤**：
1. 质量星：补 `accessibilityLabel` / `role="button"` / `accessibilityState` / `accessibilityHint`
2. 工作状态 chip：补 `accessibilityLabel` / `role="button"` / `accessibilityState` / `accessibilityHint`
3. 完整日记链接：补 `accessibilityLabel="打开完整睡眠日记"` / `role="link"`
4. 标题区域：补 `accessibilityRole="header"`

**验证**：
- Android TalkBack / iOS VoiceOver 遍历：
  - 每颗星读出"设为 N 星"或"当前 N 星"
  - chip 读出"工作状态: {label}" + 选中状态
  - 链接读出"打开完整睡眠日记"

**回滚点**：git commit `a11y(sleep): add accessibility labels to sleep card`

---

### Task 8：标题语义修正

**目标**：标题从"昨晚睡眠"改为"睡眠记录 · {date}"。

**改动文件**：`SleepSummaryCard.tsx`

**步骤**：
1. 新增日期格式化（`7月30日` 格式）
2. 标题改为`睡眠记录 · ${formatDate(todaySleep.date)}`
3. 空态标题保持"睡眠记录"（无日期）

**验证**：
- 卡片标题显示"睡眠记录 · 7月30日"（或对应日期）
- 不再出现"昨晚睡眠"文案

**回滚点**：git commit `fix(sleep): neutral card title`

---

### Task 9：清理与回归

**目标**：清理无用代码，运行测试。

**改动文件**：`SleepSummaryCard.tsx`、`sleepSummaryLogic.ts`

**步骤**：
1. 删除 `renderWorkStateLabel`（已替换为 chip 行）
2. 删除 `WORK_STATE_OPTIONS` 若已无引用（应保留，chip 行还在用）
3. 删除 `STAR_FILL` 若已无引用（应保留）
4. 检查所有 `import` 是否仍使用
5. 运行 `pnpm run test`
6. 运行 `pnpm run lint`
7. 运行 `pnpm run type-check`

**验证**：
- 测试通过
- Lint 无错误
- Type-check 无错误

**回滚点**：最终 commit `chore(sleep): cleanup after sleep card refactor`

## 3. 验证命令速查

```bash
pnpm run test          # 单元测试
pnpm run lint          # ESLint
pnpm run type-check    # TypeScript 类型检查
```

## 4. 关键回滚点

若实现过程中遇到不可预见问题，按 Task 序号逐个回滚：

```bash
git log --oneline  # 找到各任务 commit hash
git revert <hash>  # 回滚单个任务
```

## 5. 完成定义（DoD）

- [ ] AC1-AC11 全部通过手动验证
- [ ] `pnpm run test` 通过
- [ ] `pnpm run lint` 无错误
- [ ] `pnpm run type-check` 无错误
- [ ] 屏幕阅读器（TalkBack 或 VoiceOver）遍历通过
- [ ] SleepHistoryPage / SleepEngine 无回归
