## 1. 数据模型变更 (packages/core)

- [x] 1.1 修改 `packages/core/src/types/plan.ts`，Plan 接口新增 `lastDelayedNotifyAt?: number` 字段
- [x] 1.2 修改 `packages/core/src/business/plan.ts`，在 `checkAutoStatus` 函数中检测延期并返回需要发送邮箱提醒的计划列表
- [x] 1.3 添加 i18n 翻译键：`planCountdownTitle`, `planCountdownStart`, `planCountdownEnd`, `planDelayed`, `planDelayedNotify`

## 2. 倒计时组件 (apps/mobile)

- [x] 2.1 创建 `apps/mobile/src/components/PlanCountdown.tsx` 倒计时组件，支持三种状态（未开始/进行中/已超期）
- [x] 2.2 实现 `useCountdown` hook，使用 setInterval 每秒更新，监听 AppState 变化
- [x] 2.3 修改 `apps/mobile/src/features/plan/PlanDetailContent.tsx`，在进度条下方添加倒计时组件

## 3. 首页延期提醒 (apps/mobile)

- [x] 3.1 修改 `apps/mobile/src/features/home/HomeScreen.tsx`，添加延期提醒卡片组件
- [x] 3.2 实现临时关闭逻辑（useState），重新打开 APP 时重新显示
- [x] 3.3 实现点击跳转到计划详情页

## 4. 邮箱提醒 API (apps/web)

- [x] 4.1 创建 `apps/web/src/app/api/plan/notify-delayed/route.ts` API 端点
- [x] 4.2 复用 nodemailer 配置，实现发送延期提醒邮件逻辑
- [x] 4.3 添加防重复校验：检查 `lastDelayedNotifyAt` 字段

## 5. Store 集成 (packages/core)

- [x] 5.1 修改 `packages/core/src/store/planSlice.ts` 或相关 store，添加 `notifyPlanDelayed` action
- [x] 5.2 在 `checkAutoStatus` 调用后触发邮箱提醒逻辑
- [x] 5.3 更新 Plan 对象的 `lastDelayedNotifyAt` 字段

## 6. 测试与验证

- [x] 6.1 测试倒计时显示：验证三种状态（未开始/进行中/超期）
- [x] 6.2 测试倒计时实时更新：验证每秒更新和后台恢复刷新
- [x] 6.3 测试首页提醒：验证显示、临时关闭、重新显示
- [x] 6.4 测试邮箱提醒：验证发送一次和防重复机制
