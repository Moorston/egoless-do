## 1. i18n 翻译

- [x] 1.1 在 `packages/core/src/i18n/types.ts` 添加新 key：dateBarToday、noCheckinRecord
- [x] 1.2 在 `packages/core/src/i18n/zh.ts`、`en.ts`、`zh-Hant.ts` 添加对应翻译

## 2. Core 工具函数

- [x] 2.1 在 `packages/core/src/business/checkin.ts` 添加 `getFoodLogByDate(foodLog, date)` 函数，支持按日期查询饮食记录

## 3. HomeScreen 日期状态重构

- [x] 3.1 将 `const today = dateStr()` 改为 `const [viewDate, setViewDate] = useState(dateStr())`，添加 `isToday` 派生变量
- [x] 3.2 将 HomeScreen 中所有 `today` 引用（约 20 处）参数化为 `viewDate`，包括 checkinHistory 查询、planItems、customTodos、habit checkedDates、planCheckins、buildNote、togglePractice、toggleHabit 等
- [x] 3.3 添加 `isReadOnly = !isToday || isLocked` 派生变量，用于控制只读模式

## 4. 日期条组件

- [x] 4.1 创建 DateBar 组件（内联或独立文件），包含日期文字、左右箭头、"今天"按钮
- [x] 4.2 实现日期格式化："M月D日 · 周X · 今天"（今天时显示"今天"标签）
- [x] 4.3 实现箭头导航逻辑：左箭头 viewDate-1，右箭头 viewDate+1（今天时 disabled）
- [x] 4.4 实现"今天"按钮：仅 !isToday 时显示，点击跳回 dateStr()
- [x] 4.5 将 DateBar 放入 ScrollView 顶部，样式：48px 高、TH.card 背景、底部分隔线

## 5. 手势滑动

- [x] 5.1 在 HomeScreen 外层添加 PanGestureHandler，配置 activeOffsetX: [-20, 20]、failOffsetY: [-10, 10]
- [x] 5.2 实现 onHandlerStateChange：判断滑动方向和距离/速度阈值，更新 viewDate
- [x] 5.3 添加滑动动画：useSharedValue + useAnimatedStyle 实现跟随手指偏移和回弹
- [x] 5.4 处理边界：viewDate 到今天时禁用右滑手势

## 6. 只读模式 UI

- [x] 6.1 修行记录卡片：isReadOnly 时显示 Check/X 图标替代 Checkbox，不可点击
- [x] 6.2 习惯卡片：isReadOnly 时显示完成状态，不可点击
- [x] 6.3 计划任务卡片：isReadOnly 时显示完成状态，不可点击
- [x] 6.4 隐藏提交按钮、编辑按钮、+添加饮食入口（isReadOnly 时）
- [x] 6.5 体重显示历史值，步数显示"--"
- [x] 6.6 饮水/卡路里从 note JSON 的 water/food 字段恢复显示
- [x] 6.7 无记录日期显示"未打卡"空状态

## 7. 浮动气泡

- [x] 7.1 实现浮动气泡组件：右下角绝对定位，Calendar 图标 + "今天"文字
- [x] 7.2 监听 ScrollView onScroll，滚动超过 200px 且 !isToday 时淡入显示
- [x] 7.3 点击气泡调用 setViewDate(dateStr()) 跳回今天

## 8. 验证

- [x] 8.1 TypeScript 编译通过
- [ ] 8.2 手动测试：左滑/右滑切换日期、日期条导航、"今天"按钮、浮动气泡
- [ ] 8.3 手动测试：历史日期只读模式、数据恢复正确性、无记录日期空状态
- [ ] 8.4 手动测试：手势与 ScrollView 滚动不冲突
