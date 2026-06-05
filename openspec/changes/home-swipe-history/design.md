## Context

Mobile 端首页 HomeScreen 当前硬编码 `const today = dateStr()`，所有数据查询（checkinHistory、habits、planItems、customTodos、foodLog）均基于当天。用户无法在首页回溯历史打卡记录，只能去统计页查看。

已有技术基础：
- `react-native-gesture-handler` ~2.28.0（已安装，ReflectionCard 中使用 `Swipeable`）
- `react-native-reanimated` ~4.1.1（已安装）
- `isLocked` 模式已存在（status === 'done' 时字段只读）

## Goals / Non-Goals

**Goals:**
- 全屏左右滑动手势切换查看日期
- 顶部日期条显示当前查看日期，支持箭头导航和快捷回跳
- 历史日期只读模式，数据从已有 state 恢复
- 右下角浮动气泡辅助回跳

**Non-Goals:**
- 不支持历史日期编辑或补打卡
- 不支持跨月快速跳转
- Web 端不实现
- 不修改 Zustand store 结构

## Decisions

### 1. 手势方案：PanGestureHandler + Animated

**选择**：`PanGestureHandler` + `useAnimatedGestureHandler` + `useSharedValue` + `useAnimatedStyle`

**理由**：项目使用 Reanimated 4.x，v2 gesture handler API 兼容性好。相比 `GestureDetector` (v2 API)，`PanGestureHandler` 在 Expo 54 中更稳定。

**替代方案**：
- `GestureDetector` + `Gesture.Pan()`：更新的 API，但需要确认 babel 插件配置
- `Animated` (RN 原生)：性能不如 Reanimated，手势跟随体验差

**配置**：
```
activeOffsetX: [-20, 20]   // 水平滑动 >20px 才激活，避免与 ScrollView 冲突
failOffsetY: [-10, 10]     // 垂直滑动 >10px 取消手势，允许正常滚动
```

### 2. 日期状态：viewDate useState

**选择**：`const [viewDate, setViewDate] = useState(dateStr())`

**理由**：最小改动方案。viewDate 作为唯一日期源，所有数据查询从 viewDate 派生。`isToday = viewDate === dateStr()` 控制只读模式。

**数据参数化**：HomeScreen 中约 20 处 `today` 引用改为 `viewDate`，包括：
- `checkinHistory.find(c.date === viewDate)`
- `getTodayItems(planItems, plan, viewDate)`
- `getTodayCustomTodos(todos, planId, viewDate)`
- `habit.checkedDates?.includes(viewDate)`
- `planCheckins.filter(c.date === viewDate)`
- `getTodayFoodLog` → 需扩展为 `getFoodLogByDate(log, viewDate)`

### 3. 只读模式设计

**选择**：复用 `isLocked` 机制，扩展为 `isReadOnly = !isToday || isLocked`

**理由**：现有代码已通过 `isLocked` 控制 Checkbox/Check/X 的显示。历史日期时所有卡片统一进入只读态。

**UI 差异**：
- 隐藏提交按钮、编辑按钮、+添加饮食入口
- 隐藏饮水/卡路里目标编辑入口
- 步数显示"--"（历史数据不可恢复）
- 饮水/卡路里从 note JSON 的 water/food 字段恢复
- Banner 仍显示，但显示该天的状态

### 4. 日期条位置与样式

**选择**：ScrollView 内部顶部，作为第一个元素

**理由**：跟随内容滚动，不占用固定头部空间。与 Banner 紧邻，形成"日期 + 状态"的信息组合。

**样式**：
- 高度 48px，背景 TH.card，底部细线分隔
- 日期格式："6月3日 · 周二 · 昨天"（今天时显示"今天"）
- 左右箭头 24px touch target，右箭头在 isToday 时 disabled
- "今天"按钮：仅 !isToday 时显示，primary 色药丸形状

### 5. 浮动气泡

**选择**：右下角绝对定位，滚动超过 Banner 高度后淡入

**理由**：用户滚动到下方时日期条不可见，需要备用回跳入口。

**实现**：`onScroll` 事件检测滚动偏移，超过 Banner 高度（约 200px）时显示。

### 6. i18n

**新增 key**：
- `dateBarToday`："今天"
- `dateBarWeekdays`：星期数组 ["日", "一", "二", "三", "四", "五", "六"]
- `noCheckinRecord`："未打卡"

## Risks / Trade-offs

- **[手势冲突]** → `activeOffsetX: [-20, 20]` 让 ScrollView 优先进入垂直滚动，水平滑动超过阈值才接管。测试时需验证快速斜滑场景。
- **[性能]** → viewDate 变化触发所有 useMemo 重新计算。数据量小（单日），影响可忽略。
- **[历史数据完整性]** → note JSON 中部分字段可能缺失（旧记录）。`parseCheckinNote` 已有默认值处理，风险低。
- **[步数不可恢复]** → 历史日期步数显示"--"，用户可能困惑。通过 tooltip 或文案说明。
